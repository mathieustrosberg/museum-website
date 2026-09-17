/**
 * Métadonnées partagées : adresse publique du site (base des URL absolues des
 * métadonnées, du sitemap et de robots.txt), Open Graph commun aux pages et
 * image de partage d'une fiche. Module serveur.
 */
import "server-only";
import { getImageProps } from "next/image";
import site from "@/data/site.json";

/** SITE_URL en priorité, sinon l'adresse de production du déploiement Vercel, sinon le serveur local. */
export const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

/**
 * Open Graph commun, posé par le layout racine. Le titre et la description
 * Open Graph ne sont pas fixés : chaque page hérite des siens. Un segment qui
 * définit `openGraph` remplace l'objet entier : une page qui ajoute une image
 * repart de cet objet (voir shareImage).
 */
export const OPEN_GRAPH = {
  siteName: site.name,
  type: "website",
  locale: site.locale,
};

/**
 * Image de partage d'une fiche : la photographie servie par l'optimiseur du
 * site en 1200 px de large (une centaine de Ko) plutôt que l'original de l'API
 * (jusqu'à 1 Mo, que certaines messageries refusent). getImageProps donne l'URL
 * du plus grand candidat (1200 px pour une largeur affichée de 600 px) ; elle
 * est relative, metadataBase la rend absolue.
 */
export function shareImage(src, alt, { width, height }) {
  const { props } = getImageProps({
    src,
    alt,
    width: 600,
    height: Math.round((600 * height) / width),
  });
  return {
    url: props.src,
    width: 1200,
    height: Math.round((1200 * height) / width),
    alt,
  };
}
