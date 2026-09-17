import { SITE_URL } from "@/lib/metadata";

/** robots.txt : tout est indexable sauf les pages de requête (confirmation de billets, connexion, inscription, compte, favoris) et l'API du site. */
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/visit/confirmed",
        "/login",
        "/signup",
        "/account",
        "/favorites",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
