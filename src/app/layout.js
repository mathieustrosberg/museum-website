import { IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import PageTransition from "@/components/PageTransition";
import Preloader from "@/components/Preloader";
import AccountLink from "@/features/account/AccountLink";
import { getPreloaderCards, site } from "@/lib/content";
import { OPEN_GRAPH, SITE_URL } from "@/lib/metadata";
import "@/styles/globals.css";

/** IBM Plex Mono auto-hébergée par next/font : aucune requête vers Google, pas de layout shift. */
const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

const siteTitle = `${site.name} — ${site.tagline}`;

/**
 * Métadonnées communes. Le titre et la description Open Graph ne sont pas fixés
 * ici : chaque page hérite des siens. metadataBase rend absolues les URL
 * relatives (canonical, image de partage, src/app/opengraph-image.jpg).
 */
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: siteTitle, template: `${site.name} — %s` },
  description: site.meta.home,
  openGraph: OPEN_GRAPH,
};

/**
 * Root layout (Server Component) : document, police, CSS global, navigation
 * persistante, preloader et transition entre pages. Le footer (avec l'horloge de
 * Lanzarote) n'est pas ici : sa position dans la mise en page varie selon les
 * pages (colonne latérale ou pleine largeur).
 *
 * La classe `js` de <html> conditionne l'état initial masqué des apparitions
 * (animations.css). Elle est posée par un script inline, exécuté avant le
 * premier rendu, et non dans le JSX : sans JavaScript, le contenu reste
 * visible. suppressHydrationWarning : le DOM porte la classe, pas le JSX.
 *
 * Le lien de compte de la navigation dépend de la session (cookie) : c'est le
 * trou dynamique commun à toutes les pages (Suspense, Partial Prerendering),
 * le reste du layout et des pages reste prérendu.
 */
export default async function RootLayout({ children }) {
  // Cinq photographies de la collection, choisies dans site.json (home.preloader).
  const cards = await getPreloaderCards();
  return (
    <html lang={site.lang} className={mono.variable} suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: script constant, sans donnée
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
      </head>
      <body>
        <Nav
          brand={site.nav.brand}
          aria={site.nav.aria}
          links={site.nav.links}
          account={
            <Suspense fallback={null}>
              <AccountLink />
            </Suspense>
          }
        />
        {children}
        <Preloader brand={site.nav.brand} cards={cards} />
        <PageTransition />
        <noscript>
          <style>{".preloader { display: none; }"}</style>
        </noscript>
      </body>
    </html>
  );
}
