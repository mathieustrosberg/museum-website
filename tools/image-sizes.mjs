// Relève les dimensions (largeur × hauteur) de chaque PNG de public/images et écrit src/data/images.json.
// Les pages lisent ces valeurs pour next/image sans lire le disque au rendu (données prévisibles, prérendu).
// Usage : node tools/image-sizes.mjs (à relancer après make-placeholders ou tout ajout d'image)
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const DIR = join(ROOT, "public/images");
const OUT = join(ROOT, "src/data/images.json");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    ),
  );
  return files.flat();
}

const sizes = {};
for (const file of (await walk(DIR)).sort()) {
  if (!file.endsWith(".png")) continue;
  const buf = await readFile(file);
  if (buf.toString("ascii", 1, 4) !== "PNG") continue;
  const src = `/${relative(join(ROOT, "public"), file)}`;
  sizes[src] = { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
await writeFile(OUT, `${JSON.stringify(sizes, null, 2)}\n`);
console.log(`${Object.keys(sizes).length} images → src/data/images.json`);
