/**
 * Accès aux données du site. Module serveur : les pages et les Server Components
 * l'importent, jamais un Client Component (garde "server-only").
 *
 * Les textes et libellés (site.json) restent locaux ; la collection, l'archive
 * et la visite viennent de l'API de la Fondation (lib/api.js, scopes "use cache").
 * Ce module ajoute les vues dont les pages ont besoin : sélection de la home,
 * médiums distincts, œuvres proches, images dimensionnées.
 */
import "server-only";
import site from "@/data/site.json";
import {
  fetchArchive,
  fetchArchiveEntry,
  fetchWork,
  fetchWorks,
} from "@/lib/api";

export { site };

/** Formats du site : feuilles de la collection en 3:4, archive en 3:4 ou 4:3. */
const PORTRAIT = { width: 720, height: 960 };
const LANDSCAPE = { width: 960, height: 720 };

export async function getWorks() {
  return (await fetchWorks()) ?? [];
}

export function getWork(slug) {
  return fetchWork(slug);
}

/** Les 4 œuvres proches (champ `similar` de l'API), résolues dans la liste. */
export async function getSimilarWorks(work) {
  const bySlug = new Map((await getWorks()).map((w) => [w.slug, w]));
  return [...new Set(work.similar ?? [])]
    .map((slug) => bySlug.get(slug))
    .filter((w) => w && w.slug !== work.slug);
}

/** Sélection de la home, dans l'ordre de site.json. */
export async function getSelectedWorks() {
  const bySlug = new Map((await getWorks()).map((w) => [w.slug, w]));
  return site.home.selected.map((slug) => bySlug.get(slug)).filter(Boolean);
}

/**
 * Cartes du preloader : cinq photographies choisies dans site.json
 * (home.preloader : fiche et numéro de feuille), résolues dans la collection.
 * Une fiche ou une feuille absente est ignorée.
 */
export async function getPreloaderCards() {
  const bySlug = new Map((await getWorks()).map((w) => [w.slug, w]));
  return site.home.preloader
    .map(({ work: slug, sheet }) => {
      const work = bySlug.get(slug);
      const src = work && workImages(work)[sheet - 1];
      return src ? { src, ...sheetSize(work) } : null;
    })
    .filter(Boolean);
}

/** Types distincts, triés comme les filtres de la Collection. */
export async function getMediums() {
  const works = await getWorks();
  return [...new Set(works.map((w) => w.type).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
}

/** Lieux distincts (champ `location`), triés comme les filtres de la Collection. */
export async function getLocations() {
  const works = await getWorks();
  return [...new Set(works.map((w) => w.location).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
}

export async function getArchive() {
  return (await fetchArchive()) ?? [];
}

export function getArchiveEntry(slug) {
  return fetchArchiveEntry(slug);
}

/** Toutes les feuilles d'une œuvre, la couverture en tête. */
export function workImages(work) {
  return [work.image, ...(work.gallery ?? [])];
}

/** Image de couverture d'une fiche (cadre, couleur, ajustement), pour WorkCard et le preloader. */
export function coverImage(work) {
  return { src: work.image, ...sheetSize(work) };
}

/**
 * Cadre d'une photographie de la collection : boîte 3:4. Les espaces la
 * remplissent (recadrage) ; les tableaux s'y inscrivent en entier (`contain`),
 * un tableau ne se recadre pas.
 */
export function sheetSize(work) {
  return {
    ...PORTRAIT,
    color: Boolean(work.color),
    contain: work.category === "work",
  };
}

/** Image d'une entrée d'archive avec ses dimensions selon l'orientation. */
export function archiveImage(entry) {
  return {
    src: entry.image,
    ...(entry.orientation === "landscape" ? LANDSCAPE : PORTRAIT),
  };
}
