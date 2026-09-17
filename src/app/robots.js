import { SITE_URL } from "@/lib/metadata";

/** robots.txt : tout est indexable sauf la confirmation de billets (page de requête) et l'API du site. */
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/visit/confirmed", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
