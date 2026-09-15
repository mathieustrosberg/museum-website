// Génère les placeholders tramés de Halbton (dithering ordonné de Bayer, 1 bit, fond #f7f7f7)
// à partir des données : une famille visuelle par œuvre (trame, gamme de gris, motif), déclinée
// sur chacune de ses feuilles et sur sa preview ; un document ou une vue par entrée d'archive ;
// bâtiment, halle de presse, salle de lecture et entrée pour le site.
// Déterministe : un même slug produit toujours les mêmes images (mulberry32 sur un hachage FNV‑1a).
// Aucune dépendance : encodeur PNG minimal (zlib natif). Rien n'est supprimé, les dossiers sont créés.
// Usage : node tools/make-placeholders.mjs && node tools/image-sizes.mjs (les chemins /images/… sont écrits sous public/)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { deflateSync } from "node:zlib";

const ROOT = new URL("../", import.meta.url).pathname;
const readJSON = async (rel) => JSON.parse(await readFile(ROOT + rel, "utf8"));
const [site, works, archive] = await Promise.all([
  readJSON("src/data/site.json"),
  readJSON("src/data/projects.json"),
  readJSON("src/data/archive.json"),
]);

/* ---------- PNG minimal (niveaux de gris 8 bits) ---------- */
const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, gray) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0;
    gray.copy(raw, y * (w + 1) + 1, y * w, (y + 1) * w);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- Aléatoire à graine ---------- */
const hash = (str) => {
  // FNV‑1a 32 bits
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};
const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rngFor = (key) => mulberry32(hash(key));
const rand = (r, a, b) => a + r() * (b - a);
const irand = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/* ---------- Trame : matrices de Bayer 2×2, 4×4, 8×8, cellules de 2 ou 3 px ---------- */
function bayer(n) {
  let m = [
    [0, 2],
    [3, 1],
  ];
  while (m.length < n) {
    const k = m.length;
    const next = Array.from({ length: k * 2 }, () => new Array(k * 2));
    for (let y = 0; y < k; y++)
      for (let x = 0; x < k; x++) {
        const v = m[y][x] * 4;
        next[y][x] = v;
        next[y][x + k] = v + 2;
        next[y + k][x] = v + 3;
        next[y + k][x + k] = v + 1;
      }
    m = next;
  }
  return m;
}
const BAYERS = { 2: bayer(2), 4: bayer(4), 8: bayer(8) };
const BG = 247; // #f7f7f7

// scene(x, y) avec x, y ∈ [0,1] -> luminance 0..1 (0 = noir, 1 = blanc) ou null (fond).
function render(w, h, scene, { matrix = 4, cell = 2 } = {}) {
  const B = BAYERS[matrix] ?? BAYERS[4],
    n = B.length,
    n2 = n * n;
  const out = Buffer.alloc(w * h, BG);
  for (let y = 0; y < h; y++) {
    const row = B[Math.floor(y / cell) % n],
      v = (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const L = scene((x + 0.5) / w, v);
      if (L === null || L === undefined) continue;
      out[y * w + x] = L > (row[Math.floor(x / cell) % n] + 0.5) / n2 ? 255 : 0;
    }
  }
  return out;
}

/* ---------- Remplissages : f(s, t, d), s et t ∈ [0,1] dans la boîte de la forme, d = rayon² ---------- */
const flat = (L) => () => L;
const linear = (La, Lb, ax = 1, ay = 0) => {
  // dégradé le long du vecteur (ax, ay)
  const n = Math.abs(ax) + Math.abs(ay) || 1;
  return (s, t) =>
    lerp(La, Lb, clamp01(0.5 + ((s - 0.5) * ax + (t - 0.5) * ay) / n));
};
const radial = (Lc, Le) => (_s, _t, d) => lerp(Lc, Le, clamp01(d));
const lit =
  (L, k = 0.3) =>
  (s, t, d) =>
    clamp01(L + k * (1 - s - t) * (1 - 0.4 * clamp01(d))); // éclairage haut‑gauche

/* ---------- Formes (coordonnées normalisées ; A = largeur/hauteur pour les cercles et rotations) ---------- */
const ellipse = (cx, cy, rx, ry, fill) => (x, y) => {
  const nx = (x - cx) / rx,
    ny = (y - cy) / ry,
    d = nx * nx + ny * ny;
  return d > 1 ? null : fill((nx + 1) / 2, (ny + 1) / 2, d);
};
const rect = (x0, y0, x1, y1, fill) => (x, y) => {
  if (x < x0 || x >= x1 || y < y0 || y >= y1) return null;
  const s = (x - x0) / (x1 - x0),
    t = (y - y0) / (y1 - y0);
  return fill(s, t, ((2 * s - 1) ** 2 + (2 * t - 1) ** 2) / 2);
};
const union =
  (...fns) =>
  (x, y) => {
    // la première forme non nulle l'emporte (avant‑plan en tête)
    for (const f of fns) {
      if (!f) continue;
      const v = f(x, y);
      if (v !== null && v !== undefined) return v;
    }
    return null;
  };
const cut = (scene, x0, y0, x1, y1) => (x, y) =>
  x >= x0 && x < x1 && y >= y0 && y < y1 ? null : scene(x, y);
const rotated = (scene, cx, cy, angle, A) => {
  // rotation autour de (cx, cy), isotrope en pixels
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return (x, y) => {
    const X = x - cx,
      Y = (y - cy) / A;
    return scene(cx + X * c + Y * s, cy + (-X * s + Y * c) * A);
  };
};

// Bruit de valeur lissé sur un treillis fx × fy (coordonnées ∈ [0,1]).
function valueNoise(r, fx, fy) {
  const W = fx + 1,
    H = fy + 1;
  const g = Float64Array.from({ length: W * H }, () => r());
  return (x, y) => {
    const gx = clamp01(x) * fx,
      gy = clamp01(y) * fy;
    const i = Math.min(fx - 1, Math.floor(gx)),
      j = Math.min(fy - 1, Math.floor(gy));
    const u = smooth(gx - i),
      v = smooth(gy - j);
    return lerp(
      lerp(g[j * W + i], g[j * W + i + 1], u),
      lerp(g[(j + 1) * W + i], g[(j + 1) * W + i + 1], u),
      v,
    );
  };
}
// Remplissage par bandes de bruit basse fréquence posterisées sur la gamme de gris de la famille.
function noiseFill(fam, r, fx, fy, thr = 0, invert = false, detail = 0.3) {
  const n1 = valueNoise(r, fx, fy),
    n2 = valueNoise(r, fx * 2, fy * 2);
  const L = fam.levels,
    k = L.length;
  return (s, t) => {
    const v = clamp01(
      (n1(s, t) * (1 - detail) + n2(s, t) * detail - 0.5) * 1.9 + 0.5,
    );
    if (v < thr) return null;
    const idx = Math.min(k - 1, Math.floor(((v - thr) / (1 - thr)) * k));
    return L[invert ? k - 1 - idx : idx];
  };
}
// Grille de cellules (gx, gy = gouttière en fraction de cellule) ; cellFill(i, j) -> remplissage ou null.
function grid(x0, y0, x1, y1, cols, rows, gx, gy, cellFill) {
  const cw = (x1 - x0) / cols,
    ch = (y1 - y0) / rows;
  const fills = Array.from({ length: cols * rows }, (_, i) =>
    cellFill(i % cols, Math.floor(i / cols)),
  );
  return (x, y) => {
    if (x < x0 || x >= x1 || y < y0 || y >= y1) return null;
    const i = Math.floor((x - x0) / cw),
      j = Math.floor((y - y0) / ch);
    const s = (x - x0) / cw - i,
      t = (y - y0) / ch - j;
    if (s < gx || s > 1 - gx || t < gy || t > 1 - gy) return null;
    const f = fills[j * cols + i];
    if (!f) return null;
    const ss = (s - gx) / (1 - 2 * gx),
      tt = (t - gy) / (1 - 2 * gy);
    return f(ss, tt, ((2 * ss - 1) ** 2 + (2 * tt - 1) ** 2) / 2);
  };
}
// Bloc de « texte » : lignes de segments (mots) sans aucun caractère réel.
function textBlock(
  x0,
  y0,
  x1,
  y1,
  r,
  { lineH = 0.008, gap = 0.01, L = 0.06 } = {},
) {
  const pitch = lineH + gap,
    W = x1 - x0;
  const nLines = Math.max(0, Math.floor((y1 - y0 + gap) / pitch));
  const lines = [];
  let left = irand(r, 3, 8);
  for (let i = 0; i < nLines; i++) {
    if (left === 0) {
      lines.push(null);
      left = irand(r, 3, 8);
      continue;
    }
    left--;
    const end = left === 0 ? x0 + W * rand(r, 0.3, 0.9) : x1;
    const segs = [];
    let x = x0;
    while (x < end - W * 0.02) {
      const b = Math.min(end, x + W * rand(r, 0.04, 0.14));
      segs.push(x, b);
      x = b + W * rand(r, 0.015, 0.03);
    }
    lines.push(segs);
  }
  return (x, y) => {
    if (x < x0 || x >= x1 || y < y0 || y >= y1) return null;
    const p = (y - y0) / pitch,
      i = Math.floor(p);
    if (i >= lines.length || (p - i) * pitch >= lineH) return null;
    const segs = lines[i];
    if (!segs) return null;
    for (let k = 0; k < segs.length; k += 2)
      if (x >= segs[k] && x < segs[k + 1]) return L;
    return null;
  };
}
// Repères de coupe aux quatre coins d'une boîte.
function cropMarks(x0, y0, x1, y1, A, len = 0.03, off = 0.012) {
  const tx = 0.0015,
    ty = tx * A,
    ly = len * A,
    oy = off * A;
  const h = (xa, xb, y) => rect(xa, y - ty, xb, y + ty, flat(0));
  const v = (x, ya, yb) => rect(x - tx, ya, x + tx, yb, flat(0));
  return union(
    h(x0 - off - len, x0 - off, y0),
    v(x0, y0 - oy - ly, y0 - oy),
    h(x1 + off, x1 + off + len, y0),
    v(x1, y0 - oy - ly, y0 - oy),
    h(x0 - off - len, x0 - off, y1),
    v(x0, y1 + oy, y1 + oy + ly),
    h(x1 + off, x1 + off + len, y1),
    v(x1, y1 + oy, y1 + oy + ly),
  );
}

/* ---------- Familles ---------- */
const twoLevels = (fam, r) => {
  // deux niveaux distincts de la gamme
  const L = fam.levels;
  if (L.length < 2) return [L[0], L[0]];
  const i = irand(r, 0, L.length - 1);
  let j = irand(r, 0, L.length - 2);
  if (j >= i) j++;
  return [L[i], L[j]];
};
// Remplissage d'une forme selon le style de la famille (flat / lit / gradient).
function fillFor(fam, r, L = pick(r, fam.levels)) {
  if (fam.fill === "lit") return lit(L, 0.3);
  if (fam.fill === "gradient") {
    const [a, b] = twoLevels(fam, r);
    const t = r() * Math.PI * 2;
    return linear(a, b, Math.cos(t), Math.sin(t));
  }
  return flat(L);
}
// Remplissage d'une « zone image » (documents, cadres, vues).
function innerFill(fam, r) {
  const L = fam.levels;
  switch (pick(r, ["flat", "gradient", "lit", "noise", "radial"])) {
    case "gradient": {
      const [a, b] = twoLevels(fam, r);
      const t = (pick(r, [0, 45, 90, 135, 180, 270]) * Math.PI) / 180;
      return linear(a, b, Math.cos(t), Math.sin(t));
    }
    case "lit":
      return lit(pick(r, L), 0.35);
    case "noise":
      return noiseFill(fam, r, irand(r, 2, 5), irand(r, 2, 8));
    case "radial": {
      const [a, b] = twoLevels(fam, r);
      return radial(a, b);
    }
    default:
      return flat(pick(r, L));
  }
}
// n niveaux ordonnés entre lo et hi : le plus sombre dans le quart bas, le plus clair dans le quart haut
// (contraste garanti), les intermédiaires répartis entre les deux.
function spreadLevels(r, n, lo = 0.1, hi = 0.9) {
  const span = hi - lo;
  const dark = lo + span * rand(r, 0, 0.25),
    light = hi - span * rand(r, 0, 0.25);
  const levels = [dark];
  for (let i = 1; i < n - 1; i++)
    levels.push(lerp(dark, light, (i + rand(r, -0.2, 0.2)) / (n - 1)));
  if (n > 1) levels.push(light);
  return levels.map((v) => +v.toFixed(3));
}

const MOTIFS = ["ellipses", "bars", "stack", "gradient", "noise", "frame"];
function familyFor(slug) {
  const r = rngFor(`halbton:family:5:${slug}`); // le sel est choisi pour bien répartir les motifs
  const motif = pick(r, MOTIFS); // premier tirage : indépendant des tirages suivants
  const matrix = pick(r, [2, 4, 4, 8, 8]);
  return {
    motif,
    matrix,
    cell: pick(r, [2, 2, 3]),
    fill: pick(r, ["flat", "flat", "lit", "gradient"]),
    levels: spreadLevels(r, irand(r, 2, 4), 0.1, matrix === 2 ? 0.8 : 0.9), // en 2×2, 0,9 serait invisible
    margin: rand(r, 0.06, 0.14),
    gap: rand(r, 0.01, 0.05),
    vertical: r() < 0.6, // barres debout
    round: r() < 0.5, // ellipses circulaires
    anchor: pick(r, ["end", "center", "start"]),
    jitter: rand(r, 0, 1), // décalage latéral des rectangles empilés
    horizontalBands: r() < 0.7, // bandes de bruit couchées
    floating: r() < 0.5, // bruit détouré sur le fond
    touching: r() < 0.5, // rectangles empilés sans interstice
  };
}

/* ---------- Motifs des œuvres (A = largeur/hauteur de l'image) ---------- */
function composeEllipses(fam, r, A) {
  const n = pick(r, [1, 1, 2, 2, 2, 3, 3, 4]);
  const shapes = [];
  for (let i = 0; i < n; i++) {
    const rx = n === 1 ? rand(r, 0.26, 0.4) : rand(r, 0.09, 0.26);
    const ry = Math.min(rx * A * (fam.round ? 1 : rand(r, 0.7, 1.4)), 0.44);
    shapes.push(
      ellipse(
        rand(r, rx + 0.04, 0.96 - rx),
        rand(r, ry + 0.04, 0.96 - ry),
        rx,
        ry,
        fillFor(fam, r),
      ),
    );
  }
  return union(...shapes);
}
function composeBars(fam, r, A) {
  const vertical = r() < (fam.vertical ? 0.85 : 0.15);
  const n = irand(r, 3, 9);
  const mx = fam.margin,
    my = Math.min(fam.margin * A, 0.2);
  const [p0, p1, q0, q1] = vertical
    ? [mx, 1 - mx, my, 1 - my]
    : [my, 1 - my, mx, 1 - mx]; // p : travers, q : long
  const gap = fam.gap * (vertical ? 1 : A);
  const weights = Array.from({ length: n }, () => rand(r, 0.5, 1.6));
  const sum = weights.reduce((a, b) => a + b, 0),
    free = p1 - p0 - gap * (n - 1);
  const items = [];
  let p = p0;
  for (const w of weights) {
    const width = (w / sum) * free,
      len = rand(r, 0.25, 1) * (q1 - q0);
    let a, b;
    if (fam.anchor === "end") {
      a = q1 - len;
      b = q1;
    } else if (fam.anchor === "start") {
      a = q0;
      b = q0 + len;
    } else {
      const c = (q0 + q1) / 2;
      a = c - len / 2;
      b = c + len / 2;
    }
    items.push({ p0: p, p1: p + width, q0: a, q1: b, fill: fillFor(fam, r) });
    p += width + gap;
  }
  return (x, y) => {
    const pp = vertical ? x : y,
      qq = vertical ? y : x;
    for (const it of items) {
      if (pp < it.p0 || pp >= it.p1) continue;
      if (qq < it.q0 || qq >= it.q1) return null;
      const s = (pp - it.p0) / (it.p1 - it.p0),
        t = (qq - it.q0) / (it.q1 - it.q0);
      const d = ((2 * s - 1) ** 2 + (2 * t - 1) ** 2) / 2;
      return vertical ? it.fill(s, t, d) : it.fill(t, s, d);
    }
    return null;
  };
}
function composeStack(fam, r, A) {
  const n = irand(r, 3, 7);
  const mx = fam.margin,
    my = Math.min(fam.margin * A, 0.2);
  const gap = fam.touching ? 0 : fam.gap * A;
  const weights = Array.from({ length: n }, () => rand(r, 0.4, 1.6));
  const sum = weights.reduce((a, b) => a + b, 0),
    free = 1 - 2 * my - gap * (n - 1);
  const shapes = [];
  let y = my;
  for (const wgt of weights) {
    const h = (wgt / sum) * free,
      w = rand(r, 0.3, 1) * (1 - 2 * mx);
    const cx = 0.5 + rand(r, -1, 1) * fam.jitter * ((1 - 2 * mx - w) / 2);
    shapes.push(rect(cx - w / 2, y, cx + w / 2, y + h, fillFor(fam, r)));
    y += h + gap;
  }
  return union(...shapes);
}
function composeGradient(fam, r, A) {
  const full = r() < 0.3;
  const mx = full ? 0 : fam.margin,
    my = full ? 0 : Math.min(fam.margin * A, 0.2);
  const [La, Lb] = twoLevels(fam, r);
  const t = (pick(r, [0, 45, 90, 135, 180, 225, 270, 315]) * Math.PI) / 180,
    ax = Math.cos(t),
    ay = Math.sin(t);
  const main = rect(mx, my, 1 - mx, 1 - my, linear(La, Lb, ax, ay));
  if (r() < 0.6) {
    const inset = rand(r, 0.12, 0.3),
      iy = Math.min(inset * A, 0.3);
    const x0 = mx + inset,
      x1 = 1 - mx - inset,
      y0 = my + iy,
      y1 = 1 - my - iy;
    const second =
      r() < 0.5
        ? rect(x0, y0, x1, y1, linear(Lb, La, ax, ay))
        : ellipse(
            (x0 + x1) / 2,
            (y0 + y1) / 2,
            (x1 - x0) / 2,
            (y1 - y0) / 2,
            linear(Lb, La, ax, ay),
          );
    return union(second, main);
  }
  return main;
}
function composeNoise(fam, r, A) {
  const horiz = r() < (fam.horizontalBands ? 0.85 : 0.15);
  const low = irand(r, 1, 3),
    high = irand(r, 8, 16); // forte anisotropie : bandes ondulées
  const full = r() < 0.4;
  const mx = full ? 0 : fam.margin,
    my = full ? 0 : Math.min(fam.margin * A, 0.2);
  const fill = noiseFill(
    fam,
    r,
    horiz ? low : high,
    horiz ? high : low,
    fam.floating ? rand(r, 0.35, 0.5) : 0,
    r() < 0.3,
    0.15,
  );
  return rect(mx, my, 1 - mx, 1 - my, fill);
}
function composeFrame(fam, r, A) {
  const m = rand(r, 0.07, 0.18),
    mx = m,
    my = Math.min(m * A, 0.25);
  const inset = rand(r, 0.04, 0.12),
    ix = inset,
    iy = Math.min(inset * A, 0.16);
  const extra = r() < 0.5 ? rand(r, 0.02, 0.1) : 0; // marge inférieure plus large, comme une épreuve
  const L = fam.levels,
    light = L[L.length - 1],
    dark = L[0];
  const x0 = mx,
    x1 = 1 - mx,
    y0 = my,
    y1 = 1 - my;
  const ix0 = x0 + ix,
    ix1 = x1 - ix,
    iy0 = y0 + iy,
    iy1 = y1 - iy - extra;
  const paper = rect(x0, y0, x1, y1, flat(light));
  const inEllipse = () => {
    const rx = ((ix1 - ix0) / 2) * rand(r, 0.6, 1);
    const ry = fam.round
      ? Math.min(rx * A, (iy1 - iy0) / 2)
      : ((iy1 - iy0) / 2) * rand(r, 0.6, 1);
    return ellipse(
      (ix0 + ix1) / 2,
      (iy0 + iy1) / 2,
      rx,
      ry,
      fillFor(fam, r, dark),
    );
  };
  switch (
    pick(r, ["hole", "hole-ellipse", "tint", "gradient", "ellipse", "ellipse"])
  ) {
    case "hole":
      return cut(paper, ix0, iy0, ix1, iy1);
    case "hole-ellipse":
      return union(inEllipse(), cut(paper, ix0, iy0, ix1, iy1));
    case "tint":
      return union(
        rect(
          ix0,
          iy0,
          ix1,
          iy1,
          flat(pick(r, L.length > 1 ? L.slice(0, -1) : L)),
        ),
        paper,
      );
    case "gradient": {
      const [a, b] = twoLevels(fam, r);
      const t = (pick(r, [0, 90, 45, 135]) * Math.PI) / 180;
      return union(
        rect(ix0, iy0, ix1, iy1, linear(a, b, Math.cos(t), Math.sin(t))),
        paper,
      );
    }
    default:
      return union(inEllipse(), paper);
  }
}
const COMPOSERS = {
  ellipses: composeEllipses,
  bars: composeBars,
  stack: composeStack,
  gradient: composeGradient,
  noise: composeNoise,
  frame: composeFrame,
};

// Petit accent occasionnel (pastille ou trait), comme une marque d'imprimeur.
function accent(fam, r, A) {
  const L = fam.levels[0];
  if (r() < 0.5) {
    const rad = rand(r, 0.03, 0.07);
    return ellipse(rand(r, 0.1, 0.9), rand(r, 0.1, 0.9), rad, rad * A, flat(L));
  }
  const th = rand(r, 0.01, 0.03),
    x = rand(r, 0.1, 0.9),
    y = rand(r, 0.1, 0.9),
    len = rand(r, 0.15, 0.4);
  return r() < 0.5
    ? rect(x - th / 2, y, x + th / 2, Math.min(1, y + len * A), flat(L))
    : rect(
        x,
        y - (th * A) / 2,
        Math.min(1, x + len),
        y + (th * A) / 2,
        flat(L),
      );
}
function compose(fam, r, A) {
  const main = (COMPOSERS[fam.motif] ?? composeEllipses)(fam, r, A);
  return r() < 0.2 ? union(accent(fam, r, A), main) : main;
}

/* ---------- Archive : documents (portrait) et vues (paysage), variés selon entry.type ---------- */
const PAPER = 0.95;
const DOCS = {
  sheet: docSheet,
  text: docText,
  proof: docProof,
  contact: docContact,
};
const VIEWS = {
  press: viewPress,
  table: viewTable,
  room: viewRoom,
  rack: viewRack,
};
function archiveFamily(type) {
  const r = rngFor(`halbton:archive:58:${type}`); // le sel est choisi pour bien répartir les variantes
  return {
    doc: pick(r, Object.keys(DOCS)), // premiers tirages : indépendants des suivants
    view: pick(r, Object.keys(VIEWS)),
    matrix: pick(r, [4, 4, 8]), // 2×2 rendrait le papier (0,95) invisible
    cell: pick(r, [2, 2, 3]),
    fill: pick(r, ["flat", "gradient", "lit"]),
    levels: spreadLevels(r, irand(r, 3, 4)),
  };
}
// Feuille à marge : zone image et courte légende.
function docSheet(fam, r, A) {
  const mx = rand(r, 0.06, 0.12),
    my = mx * A;
  const paper = rect(mx, my, 1 - mx, 1 - my, flat(PAPER));
  const ix = rand(r, 0.05, 0.1),
    iy = ix * A;
  const x0 = mx + ix,
    x1 = 1 - mx - ix,
    y0 = my + iy,
    y1 = y0 + rand(r, 0.45, 0.65) * (1 - 2 * my);
  const image = rect(x0, y0, x1, y1, innerFill(fam, r));
  const cy = y1 + 0.025;
  const caption = textBlock(
    x0,
    cy,
    x0 + (x1 - x0) * rand(r, 0.4, 0.8),
    cy + 3 * 0.017,
    r,
    { lineH: 0.007, gap: 0.01 },
  );
  const folio = rect(
    x1 - 0.03,
    1 - my - iy * 0.7,
    x1,
    1 - my - iy * 0.7 + 0.006,
    flat(0.05),
  );
  return union(image, caption, folio, paper);
}
// Page de texte : titre, colonnes ou figure, folio.
function docText(fam, r, A) {
  const mx = rand(r, 0.06, 0.12),
    my = mx * A;
  const paper = rect(mx, my, 1 - mx, 1 - my, flat(PAPER));
  const ix = rand(r, 0.08, 0.14),
    iy = ix * A;
  const x0 = mx + ix,
    x1 = 1 - mx - ix,
    y0 = my + iy * 1.4,
    y1 = 1 - my - iy * 1.6;
  const parts = [];
  const titleH = 0.018;
  parts.push(
    rect(x0, y0, x0 + (x1 - x0) * rand(r, 0.3, 0.6), y0 + titleH, flat(0.05)),
  );
  const y = y0 + titleH + 0.03;
  const mode = pick(r, ["one", "two", "figure"]);
  if (mode === "two") {
    const g = 0.03,
      cw = (x1 - x0 - g) / 2;
    parts.push(
      textBlock(x0, y, x0 + cw, y1, r),
      textBlock(x0 + cw + g, y, x1, y1, r),
    );
  } else if (mode === "figure") {
    const fy0 = y + rand(r, 0.1, 0.3),
      fh = rand(r, 0.15, 0.25);
    parts.push(
      textBlock(x0, y, x1, fy0 - 0.02, r),
      rect(x0, fy0, x1, fy0 + fh, innerFill(fam, r)),
      textBlock(x0, fy0 + fh + 0.02, x1, y1, r),
    );
  } else parts.push(textBlock(x0, y, x1, y1, r));
  parts.push(
    rect(0.48, 1 - my - iy * 0.8, 0.52, 1 - my - iy * 0.8 + 0.006, flat(0.05)),
  );
  return union(...parts, paper);
}
// Épreuve : image, repères de coupe, gamme de contrôle, croix de repérage.
function docProof(fam, r, A) {
  const mx = rand(r, 0.12, 0.18),
    my = mx * A + rand(r, 0.02, 0.06);
  const x0 = mx,
    x1 = 1 - mx,
    y0 = my,
    y1 = 1 - my - rand(r, 0.06, 0.12);
  const image = rect(x0, y0, x1, y1, innerFill(fam, r));
  const marks = cropMarks(x0, y0, x1, y1, A);
  const n = irand(r, 6, 12),
    sw = 0.026,
    sy = y1 + 0.03;
  const strip = grid(x0, sy, x0 + n * sw, sy + sw * A, n, 1, 0.08, 0.08, (i) =>
    flat(i / (n - 1)),
  );
  const rx = 0.012,
    cx = x1 - rx,
    cy = sy + (sw * A) / 2;
  const reg = union(
    ellipse(cx, cy, rx * 0.55, rx * 0.55 * A, flat(1)),
    ellipse(cx, cy, rx, rx * A, flat(0)),
  );
  return union(marks, strip, reg, image);
}
// Planche contact : feuille sombre, grille de vues claires.
function docContact(fam, r, A) {
  const mx = rand(r, 0.05, 0.1),
    my = mx * A;
  const L = fam.levels;
  const sheet = rect(mx, my, 1 - mx, 1 - my, flat(Math.max(0.05, L[0] - 0.05)));
  const cols = pick(r, [3, 4, 5]),
    g = 0.05;
  const fw = (1 - 2 * mx - 2 * g) / cols,
    fh = fw * pick(r, [1, 2 / 3, 2 / 3]) * A;
  const rows = Math.max(1, Math.floor((1 - 2 * my - 2 * g * A) / fh));
  const x0 = mx + g,
    y0 = my + g * A;
  const cells = grid(
    x0,
    y0,
    x0 + cols * fw,
    y0 + rows * fh,
    cols,
    rows,
    0.08,
    0.1,
    () => {
      if (r() < 0.12) return null; // vue vide
      const k = pick(r, ["flat", "grad", "lit"]);
      if (k === "grad") {
        const [a, b] = twoLevels(fam, r);
        return linear(a, b, r() < 0.5 ? 1 : 0, r() < 0.5 ? 0 : 1);
      }
      if (k === "lit") return lit(pick(r, L), 0.35);
      return flat(pick(r, L.slice(1)));
    },
  );
  return union(cells, sheet);
}
// Presse : grandes masses horizontales, cylindres, sol.
function viewPress(fam, r, A) {
  const L = fam.levels,
    dark = L[0],
    mid = L[Math.floor(L.length / 2)],
    light = L[L.length - 1];
  const floorY = rand(r, 0.74, 0.82);
  const bx0 = rand(r, 0.06, 0.14),
    bx1 = 1 - rand(r, 0.06, 0.14),
    bodyY = rand(r, 0.42, 0.52);
  const topY = bodyY - rand(r, 0.12, 0.2),
    tx0 = bx0 + rand(r, 0.05, 0.15),
    tx1 = bx1 - rand(r, 0.05, 0.15);
  const n = irand(r, 2, 4),
    rad = Math.min((tx1 - tx0) / (n * 2.4), 0.07);
  const cylinders = Array.from({ length: n }, (_, i) =>
    ellipse(
      tx0 + ((i + 0.5) * (tx1 - tx0)) / n,
      bodyY + 0.02,
      rad,
      rad * A,
      lit(light, 0.45),
    ),
  );
  return union(
    ...cylinders,
    rect(bx0 + 0.02, bodyY + 0.08, bx0 + 0.12, bodyY + 0.2, flat(light)), // pupitre
    rect(
      bx1 - 0.02,
      bodyY + 0.05,
      Math.min(1, bx1 + 0.12),
      bodyY + 0.08,
      flat(mid),
    ), // table de marge
    rect(tx0, topY, tx1, bodyY, flat(dark)), // groupe supérieur
    rect(bx0, bodyY, bx1, floorY, fillFor(fam, r, mid)), // bâti
    rect(bx0 - 0.02, floorY, bx1 + 0.02, floorY + 0.03, flat(dark)), // ombre
    rect(0, floorY, 1, 1, flat(light)), // sol
  );
}
// Table lumineuse : plateau clair, feuilles posées de travers, piètement.
function viewTable(fam, r, A) {
  const L = fam.levels,
    dark = L[0];
  const tx0 = rand(r, 0.04, 0.1),
    tx1 = 1 - rand(r, 0.04, 0.1),
    ty0 = rand(r, 0.18, 0.28),
    ty1 = rand(r, 0.72, 0.82);
  const n = irand(r, 3, 6),
    sheets = [];
  for (let i = 0; i < n; i++) {
    const w = rand(r, 0.12, 0.24),
      h = Math.min(w * rand(r, 1.2, 1.45) * A, 0.4);
    const cx = rand(r, tx0 + w, tx1 - w),
      cy = rand(r, ty0 + h / 2, ty1 - h / 2);
    sheets.push(
      rotated(
        rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, innerFill(fam, r)),
        cx,
        cy,
        rand(r, -0.25, 0.25),
        A,
      ),
    );
  }
  return union(
    ...sheets,
    rect(tx0, ty1, tx1, ty1 + 0.03, flat(dark)), // chant
    rect(tx0 + 0.03, ty1 + 0.03, tx0 + 0.06, 1, flat(dark)),
    rect(tx1 - 0.06, ty1 + 0.03, tx1 - 0.03, 1, flat(dark)), // pieds
    rect(tx0, ty0, tx1, ty1, flat(PAPER)), // plateau
  );
}
// Salle : mur, sol, accrochage de cadres, banc ou porte.
function viewRoom(fam, r, A) {
  const L = fam.levels,
    k = L.length,
    dark = L[0];
  const horizon = rand(r, 0.62, 0.74),
    eye = rand(r, 0.34, 0.42);
  const n = irand(r, 2, 5),
    gap = 0.03,
    totalW = rand(r, 0.5, 0.8);
  const ws = Array.from({ length: n }, () => rand(r, 0.5, 1.5)),
    sum = ws.reduce((a, b) => a + b, 0);
  const frames = [];
  let x = 0.5 - totalW / 2;
  for (let i = 0; i < n; i++) {
    const w = (ws[i] / sum) * (totalW - gap * (n - 1)),
      h = Math.min(w * rand(r, 0.7, 1.3) * A, 0.5);
    frames.push(rect(x, eye - h / 2, x + w, eye + h / 2, innerFill(fam, r)));
    frames.push(
      rect(
        x - 0.008,
        eye - h / 2 - 0.008 * A,
        x + w + 0.008,
        eye + h / 2 + 0.008 * A,
        flat(dark),
      ),
    );
    x += w + gap;
  }
  const bench =
    r() < 0.5
      ? union(
          rect(0.35, horizon + 0.06, 0.65, horizon + 0.09, flat(dark)),
          rect(0.37, horizon + 0.09, 0.385, horizon + 0.17, flat(dark)),
          rect(0.615, horizon + 0.09, 0.63, horizon + 0.17, flat(dark)),
        )
      : null;
  const door =
    r() < 0.4 ? rect(0.82, 0.2, 0.94, horizon, flat(L[1] ?? dark)) : null;
  return union(
    ...frames,
    bench,
    door,
    rect(0, horizon - 0.015, 1, horizon, flat(dark)), // plinthe
    rect(0, horizon, 1, 1, flat(L[Math.max(0, k - 2)])), // sol
    rect(0, 0, 1, horizon, flat(L[k - 1])), // mur
  );
}
// Séchoir : barres horizontales et feuilles suspendues.
function viewRack(fam, r, _A) {
  const L = fam.levels,
    dark = L[0];
  const rows = irand(r, 3, 5),
    mx = 0.06,
    rowH = 0.9 / rows,
    parts = [];
  for (let j = 0; j < rows; j++) {
    const y = 0.05 + j * rowH;
    parts.push(rect(mx, y, 1 - mx, y + 0.012, flat(dark)));
    let x = mx + rand(r, 0, 0.05);
    while (x < 1 - mx - 0.06) {
      const w = rand(r, 0.06, 0.16),
        h = rand(r, 0.4, 0.85) * (rowH - 0.03);
      if (x + w > 1 - mx) break;
      parts.push(rect(x, y + 0.012, x + w, y + 0.012 + h, fillFor(fam, r)));
      x += w + rand(r, 0.01, 0.06);
    }
  }
  parts.push(
    rect(mx, 0.03, mx + 0.012, 0.97, flat(dark)),
    rect(1 - mx - 0.012, 0.03, 1 - mx, 0.97, flat(dark)),
  );
  return union(...parts);
}

/* ---------- Site : bâtiment, halle de presse, salle de lecture, entrée ---------- */
const SITE_FAMILY = {
  matrix: 4,
  cell: 2,
  levels: [0.15, 0.4, 0.62, 0.88],
  fill: "flat",
};
// Bâtiment : halle à toit en sheds, tour, cheminée, aile basse.
function siteBuilding(fam, r, _A) {
  const L = fam.levels,
    groundY = 0.8;
  const hx0 = 0.12,
    hx1 = rand(r, 0.64, 0.7),
    hTop = rand(r, 0.3, 0.36),
    teeth = irand(r, 3, 5),
    depth = 0.09;
  const hall = (x, y) => {
    if (x < hx0 || x >= hx1 || y >= groundY) return null;
    const u = ((x - hx0) / (hx1 - hx0)) * teeth,
      f = u - Math.floor(u);
    if (y < hTop + depth * (1 - f)) return null; // pente du shed
    if (f > 0.88 && y < hTop + depth) return L[3]; // vitrage vertical du shed
    return L[2];
  };
  return union(
    grid(hx0 + 0.03, 0.52, hx1 - 0.03, 0.72, 7, 2, 0.12, 0.15, () =>
      flat(L[0]),
    ), // fenêtres de la halle
    grid(hx1 + 0.03, 0.2, hx1 + 0.13, 0.7, 2, 5, 0.15, 0.2, () => flat(L[3])), // fenêtres de la tour
    hall,
    rect(hx1, rand(r, 0.12, 0.18), hx1 + 0.16, groundY, flat(L[1])), // tour
    rect(hx1 + 0.18, rand(r, 0.03, 0.08), hx1 + 0.215, groundY, flat(L[0])), // cheminée
    rect(0.02, 0.56, hx0, groundY, flat(L[3])), // aile basse
    rect(0.02, groundY, hx1 + 0.24, groundY + 0.025, flat(L[1])), // ombre
    rect(0, groundY, 1, 1, flat(L[3])), // sol
  );
}
// Halle de presse (portrait) : fenêtres hautes, pilier, presse, pile de papier.
function sitePressHall(fam, r, A) {
  const L = fam.levels,
    floorY = 0.72,
    bodyY = rand(r, 0.48, 0.52);
  const cylinders = Array.from({ length: 3 }, (_, i) =>
    ellipse(0.32 + i * 0.18, bodyY + 0.015, 0.06, 0.06 * A, lit(L[3], 0.45)),
  );
  return union(
    ...cylinders,
    rect(0.2, bodyY + 0.06, 0.3, bodyY + 0.18, flat(L[3])), // pupitre
    rect(0.84, bodyY + 0.05, 0.97, bodyY + 0.08, flat(L[1])), // table de marge
    rect(0.24, bodyY - 0.1, 0.78, bodyY, flat(L[0])), // groupe supérieur
    rect(0.16, bodyY, 0.86, floorY, flat(L[2])), // bâti
    rect(0.14, floorY, 0.9, floorY + 0.02, flat(L[0])), // ombre
    rect(0.04, 0, 0.1, floorY, flat(L[1])), // pilier
    grid(0.14, 0.06, 0.9, 0.3, 4, 1, 0.08, 0.08, () =>
      linear(L[3], L[2], 0, 1),
    ), // fenêtres hautes
    rect(0.06, floorY + 0.05, 0.22, floorY + 0.058, flat(PAPER)), // pile de papier (dessus clair)
    rect(0.06, floorY + 0.058, 0.22, floorY + 0.12, flat(L[1])), // tranche
    rect(0, floorY, 1, 1, flat(L[3])), // sol
  );
}
// Salle de lecture (portrait) : rayonnages de livres, table, sol.
function siteReadingRoom(fam, r, _A) {
  const L = fam.levels,
    rows = 5,
    x0 = 0.1,
    x1 = 0.9,
    top = 0.06,
    rowH = 0.12;
  const shelves = [];
  for (let j = 0; j < rows; j++) {
    const yTop = top + j * rowH,
      yBottom = yTop + rowH - 0.012;
    const books = [];
    let x = x0 + rand(r, 0, 0.02);
    while (x < x1 - 0.02) {
      const w = rand(r, 0.012, 0.035);
      if (r() < 0.08) {
        x += w;
        continue;
      } // vide
      books.push({
        a: x,
        b: Math.min(x1, x + w),
        h: rand(r, 0.5, 0.92) * (rowH - 0.012),
        L: pick(r, L),
      });
      x += w + 0.003;
    }
    shelves.push((x, y) => {
      if (y < yTop || y >= yBottom || x < x0 || x >= x1) return null;
      for (const b of books)
        if (x >= b.a && x < b.b) return y >= yBottom - b.h ? b.L : null;
      return null;
    });
    shelves.push(rect(x0, yBottom, x1, yBottom + 0.012, flat(L[0]))); // tablette
  }
  return union(
    ...shelves,
    rect(x0 - 0.02, top - 0.02, x0, top + rows * rowH, flat(L[0])),
    rect(x1, top - 0.02, x1 + 0.02, top + rows * rowH, flat(L[0])), // joues
    rect(0.3, 0.76, 0.42, 0.78, flat(L[2])),
    rect(0.5, 0.765, 0.66, 0.78, flat(L[1])), // documents posés
    rect(0.2, 0.78, 0.8, 0.8, flat(L[0])), // table
    rect(0.23, 0.8, 0.245, 0.92, flat(L[0])),
    rect(0.755, 0.8, 0.77, 0.92, flat(L[0])), // pieds
    rect(0, 0.9, 1, 1, flat(L[3])), // sol
  );
}
// Entrée (paysage) : façade, porte à imposte, fenêtres, marches, enseigne, lampe.
function siteEntrance(fam, r, A) {
  const L = fam.levels,
    groundY = 0.84,
    d0 = 0.41,
    d1 = 0.59,
    doorTop = 0.25;
  const win = (x0, x1) =>
    union(
      rect(x0, 0.31, x1, 0.69, linear(L[2], L[3], 1, 1)),
      rect(x0 - 0.01, 0.3, x1 + 0.01, 0.7, flat(L[0])),
    );
  return union(
    ellipse(0.5, 0.16, 0.02, 0.02 * A, flat(L[0])), // lampe
    rect(0.64, 0.42, 0.7, 0.52, flat(L[0])),
    rect(0.652, 0.44, 0.688, 0.5, flat(L[3])), // enseigne
    rect(0.498, doorTop + 0.08, 0.502, groundY, flat(L[3])), // battants
    rect(0.47, 0.55, 0.485, 0.57, flat(L[3])),
    rect(0.515, 0.55, 0.53, 0.57, flat(L[3])), // poignées
    rect(d0, doorTop, d1, doorTop + 0.07, linear(L[3], L[2], 0, 1)), // imposte
    rect(d0, doorTop, d1, groundY, flat(L[0])), // porte
    rect(d0 - 0.02, doorTop - 0.03, d1 + 0.02, groundY, flat(L[1])), // encadrement
    win(0.1, 0.28),
    win(0.72, 0.9), // fenêtres
    rect(0.36, groundY, 0.64, groundY + 0.03, flat(L[3])),
    rect(0.36, groundY + 0.025, 0.64, groundY + 0.03, flat(L[0])), // marches
    rect(0.33, groundY + 0.03, 0.67, groundY + 0.06, flat(L[3])),
    rect(0.33, groundY + 0.055, 0.67, groundY + 0.06, flat(L[0])),
    rect(0, groundY, 1, 1, flat(L[2])), // trottoir
    rect(0, 0, 1, groundY, noiseFill({ levels: [L[3], PAPER] }, r, 6, 24)), // façade
  );
}

/* ---------- Production ---------- */
const jobs = new Map(); // chemin -> { w, h, scene, screen }
const add = (path, w, h, scene, screen) => {
  if (typeof path !== "string" || !path || jobs.has(path)) return;
  jobs.set(path, { w, h, scene, screen });
};

let sheetCount = 0,
  previewCount = 0,
  archiveCount = 0,
  siteCount = 0;
for (const work of works ?? []) {
  const fam = familyFor(work.slug);
  (work.images ?? []).forEach((p, i) => {
    add(
      p,
      720,
      960,
      compose(fam, rngFor(`${work.slug}#${i + 1}`), 720 / 960),
      fam,
    );
    sheetCount++;
  });
  if (work.preview) {
    add(
      work.preview,
      952,
      608,
      compose(fam, rngFor(`${work.slug}#preview`), 952 / 608),
      fam,
    );
    previewCount++;
  }
}
for (const e of archive ?? []) {
  if (!e.image) continue;
  const fam = archiveFamily(e.type ?? "");
  const r = rngFor(`halbton:entry:${e.slug ?? e.image}`);
  if (e.orientation === "landscape")
    add(e.image, 960, 720, VIEWS[fam.view](fam, r, 960 / 720), fam);
  else add(e.image, 720, 960, DOCS[fam.doc](fam, r, 720 / 960), fam);
  archiveCount++;
}
{
  const fam = SITE_FAMILY,
    seed = `halbton:site:${site.name ?? ""}`;
  if (site.home?.media?.src) {
    add(
      site.home.media.src,
      952,
      608,
      siteBuilding(fam, rngFor(`${seed}:building`), 952 / 608),
      fam,
    );
    siteCount++;
  }
  const abouts = [sitePressHall, siteReadingRoom];
  (site.about?.images ?? []).forEach((img, i) => {
    if (!img?.src) return;
    add(
      img.src,
      720,
      960,
      abouts[i % abouts.length](fam, rngFor(`${seed}:about:${i}`), 720 / 960),
      fam,
    );
    siteCount++;
  });
  if (site.visit?.media?.src) {
    add(
      site.visit.media.src,
      960,
      720,
      siteEntrance(fam, rngFor(`${seed}:entrance`), 960 / 720),
      fam,
    );
    siteCount++;
  }
}

let bytes = 0;
for (const [path, job] of jobs) {
  const abs = `${ROOT}public${path}`;
  await mkdir(dirname(abs), { recursive: true });
  const buf = png(job.w, job.h, render(job.w, job.h, job.scene, job.screen));
  await writeFile(abs, buf);
  bytes += buf.length;
  console.log(
    `${path}  ${job.w}×${job.h}  ${(buf.length / 1024).toFixed(1)} Ko`,
  );
}
console.log(
  `\n${jobs.size} fichiers (${sheetCount} feuilles, ${previewCount} previews, ${archiveCount} archive, ${siteCount} site), ${(bytes / 1024).toFixed(0)} Ko`,
);
