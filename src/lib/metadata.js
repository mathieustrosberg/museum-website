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

/**
 * Résumé d'une notice pour la balise description : les premières phrases
 * entières qui tiennent dans `max` caractères (le crédit photographique, en
 * dernière phrase, n'y entre pas).
 */
export function excerpt(text, max = 155) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) ?? [text];
  let out = "";
  for (const sentence of sentences) {
    if ((out + sentence).trim().length > max) break;
    out += sentence;
  }
  return out.trim() || text.slice(0, max).trim();
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** La Fondation en tant que musée (schema.org/Museum), d'après les informations de visite de l'API. */
export function museumJsonLd(visit) {
  const [opens, closes] = visit.hours.split("–");
  return {
    "@context": "https://schema.org",
    "@type": "Museum",
    "@id": `${SITE_URL}/#museum`,
    name: visit.name,
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image.jpg`,
    address: visit.address,
    telephone: visit.phone,
    email: visit.email,
    hasMap: visit.addressLink,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: visit.openWeekdays.map((day) => DAYS[day]),
      opens,
      closes,
    },
  };
}

/** Fiche de la collection : tableau (VisualArtwork) ou lieu conçu par l'artiste (TouristAttraction). */
export function workJsonLd(work, image) {
  const common = {
    "@context": "https://schema.org",
    name: work.title,
    description: excerpt(work.description),
    url: `${SITE_URL}/work/${work.slug}`,
    image: `${SITE_URL}${image.url}`,
  };
  if (work.category === "work") {
    return {
      ...common,
      "@type": "VisualArtwork",
      artform: work.type,
      artMedium: work.medium,
      creator: { "@type": "Person", name: work.artist },
    };
  }
  return {
    ...common,
    "@type": "TouristAttraction",
    address: work.location,
    ...(work.year ? { foundingDate: String(work.year) } : {}),
  };
}

/** Entrée d'archive : photographie. */
export function photoJsonLd(entry, image) {
  return {
    "@context": "https://schema.org",
    "@type": "Photograph",
    name: entry.title,
    description: entry.description,
    url: `${SITE_URL}/archive/${entry.slug}`,
    image: `${SITE_URL}${image.url}`,
    ...(/^\d{4}$/.test(entry.date) ? { dateCreated: entry.date } : {}),
  };
}

/** Fil d'Ariane d'une fiche : [{ name, path }]. */
export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
