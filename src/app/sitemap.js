import { getArchive, getWorks } from "@/lib/content";
import { SITE_URL } from "@/lib/metadata";

/**
 * Plan du site : pages fixes, fiches de la collection et entrées d'archive.
 * Les listes viennent du cache (lib/api.js) et se revalident comme les pages ;
 * /visit/confirmed (noindex) n'y figure pas.
 */
export default async function sitemap() {
  const [works, archive] = await Promise.all([getWorks(), getArchive()]);
  const paths = [
    "/",
    "/work",
    "/archive",
    "/about",
    "/visit",
    ...works.map((work) => `/work/${work.slug}`),
    ...archive.map((entry) => `/archive/${entry.slug}`),
  ];
  return paths.map((path) => ({ url: `${SITE_URL}${path}` }));
}
