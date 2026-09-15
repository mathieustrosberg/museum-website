// Calcule le champ `similar` (4 slugs) de chaque œuvre de src/data/projects.json et l'écrit dans le fichier.
// Règle, par ordre de poids : même médium (3), même artiste (2), même exposition (1),
// mots-clés de technique en commun (0,5 chacun : offset, newsprint, riso, gelatin, screen, lpi…),
// puis proximité d'année, puis l'œuvre la moins citée jusqu'ici (rééquilibrage), puis le titre.
// Usage : node tools/similar-works.mjs   (relancer après tout ajout ou retrait d'œuvre)
import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../src/data/projects.json", import.meta.url);
const COUNT = 4;
const KEYWORDS = [
  "offset",
  "newsprint",
  "riso",
  "gelatin",
  "silver",
  "screen",
  "lpi",
  "inkjet",
  "gravure",
  "contact",
  "generated",
  "1-bit",
  "film",
  "plate",
  "rag",
  "fibre",
];

const works = JSON.parse(await readFile(FILE, "utf8"));
const tokens = (w) =>
  new Set(
    KEYWORDS.filter((k) =>
      `${w.category} ${w.technique}`.toLowerCase().includes(k),
    ),
  );
const overlap = (a, b) => [...a].filter((k) => b.has(k)).length;

const cited = new Map(works.map((w) => [w.slug, 0]));
for (const w of works) {
  const own = tokens(w);
  const ranked = works
    .filter((o) => o.slug !== w.slug)
    .map((o) => ({
      slug: o.slug,
      title: o.title,
      score:
        (o.category === w.category ? 3 : 0) +
        (o.artist === w.artist ? 2 : 0) +
        (o.exhibition === w.exhibition ? 1 : 0) +
        0.5 * overlap(own, tokens(o)),
      dy: Math.abs(o.year - w.year),
      cited: cited.get(o.slug),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.dy - b.dy ||
        a.cited - b.cited ||
        a.title.localeCompare(b.title),
    );
  w.similar = ranked.slice(0, COUNT).map((r) => r.slug);
  for (const slug of w.similar) cited.set(slug, cited.get(slug) + 1);
}

// Garantie : chaque œuvre est citée au moins une fois. Une œuvre orpheline remplace la 4e carte
// de l'œuvre qui la classe le mieux, à condition que la carte remplacée reste citée ailleurs.
const rank = (from, to) => {
  const a = tokens(from),
    b = tokens(to);
  return (
    (to.category === from.category ? 3 : 0) +
    (to.artist === from.artist ? 2 : 0) +
    (to.exhibition === from.exhibition ? 1 : 0) +
    0.5 * overlap(a, b) -
    Math.abs(to.year - from.year) / 100
  );
};
for (const orphan of works.filter((w) => cited.get(w.slug) === 0)) {
  const host = works
    .filter(
      (w) => w.slug !== orphan.slug && cited.get(w.similar[COUNT - 1]) > 1,
    )
    .sort((a, b) => rank(b, orphan) - rank(a, orphan))[0];
  if (!host) continue;
  const dropped = host.similar[COUNT - 1];
  host.similar[COUNT - 1] = orphan.slug;
  cited.set(dropped, cited.get(dropped) - 1);
  cited.set(orphan.slug, 1);
  console.log(
    `orphelin ${orphan.slug} placé chez ${host.slug} à la place de ${dropped}`,
  );
}

await writeFile(FILE, `${JSON.stringify(works, null, 2)}\n`);
for (const w of works)
  console.log(w.slug.padEnd(18), "→", w.similar.join(", "));
console.log("citations :", [...cited].map(([s, n]) => `${s} ${n}`).join(", "));
