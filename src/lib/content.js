/**
 * Accès aux données du site. Module serveur : les pages et les Server Components
 * l'importent, jamais un Client Component (garde "server-only").
 *
 * Aujourd'hui les données sont des fichiers JSON importés au chargement du module :
 * pour Next.js ce sont des valeurs prévisibles, chaque route est donc prérendue en
 * shell statique complet (SSG) sans directive de cache.
 *
 * Quand l'API existera : rendre ces fonctions async, y placer "use cache" +
 * cacheLife("hours") + cacheTag("works") et remplacer la lecture du JSON par le
 * fetch. Les signatures et les composants appelants ne changent pas.
 */
import "server-only";
import archive from "@/data/archive.json";
import artists from "@/data/artists.json";
import exhibitions from "@/data/exhibitions.json";
import images from "@/data/images.json";
import projects from "@/data/projects.json";
import site from "@/data/site.json";

export { site };

const artistBySlug = new Map(artists.map((a) => [a.slug, a]));
const workBySlug = new Map(projects.map((p) => [p.slug, p]));
const entryBySlug = new Map(archive.map((e) => [e.slug, e]));

/** Slugs des œuvres présentées dans une exposition en cours. */
export const onView = new Set(
  exhibitions.filter((e) => e.status === "on view").flatMap((e) => e.works),
);

/** Expositions en cours, dans l'ordre du fichier. */
export function getExhibitionsOnView() {
  return exhibitions.filter((e) => e.status === "on view");
}

export function getWorks() {
  return projects;
}

export function getWork(slug) {
  return workBySlug.get(slug) ?? null;
}

export function getArtist(slug) {
  return artistBySlug.get(slug) ?? null;
}

export function artistName(work) {
  return getArtist(work.artist)?.name ?? work.artist;
}

/** Les 4 œuvres proches (champ `similar`, calculé par tools/similar-works.mjs). */
export function getSimilarWorks(work) {
  return [...new Set(work.similar ?? [])]
    .map(getWork)
    .filter((w) => w && w.slug !== work.slug);
}

export function getSelectedWorks() {
  return site.home.selected.map(getWork).filter(Boolean);
}

/** Médiums distincts, triés comme les filtres de la Collection. */
export function getMediums() {
  return [...new Set(projects.map((p) => p.category).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "en"),
  );
}

export function getArchive() {
  return archive;
}

export function getArchiveEntry(slug) {
  return entryBySlug.get(slug) ?? null;
}

/** Image de couverture d'une œuvre avec ses dimensions, pour WorkCard. */
export function coverImage(work) {
  const src = work.images[0];
  return { src, ...imageSize(src) };
}

/** Dimensions intrinsèques d'une image de public/ (src/data/images.json). */
export function imageSize(src) {
  return images[src] ?? { width: 720, height: 960 };
}
