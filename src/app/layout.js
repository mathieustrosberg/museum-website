import { IBM_Plex_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import PageTransition from "@/components/PageTransition";
import Preloader from "@/components/Preloader";
import Clock from "@/features/visit/Clock";
import { coverImage, getSelectedWorks, site } from "@/lib/content";
import "@/styles/globals.css";

/** IBM Plex Mono auto-hébergée par next/font : aucune requête vers Google, pas de layout shift. */
const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

const siteTitle = `${site.name} — ${site.tagline}`;

export const metadata = {
  title: { default: siteTitle, template: `${site.name} — %s` },
  description: site.meta.home,
  openGraph: {
    siteName: site.name,
    title: siteTitle,
    description: site.meta.home,
    type: "website",
    locale: "en",
  },
};

/**
 * Root layout (Server Component) : document, police, CSS global, navigation
 * persistante, preloader, son de clic et transition entre pages. Le footer n'est pas ici : sa position dans la
 * mise en page varie selon les pages (colonne latérale ou pleine largeur).
 */
export default function RootLayout({ children }) {
  // Cinq feuilles de la sélection de la home, cartes du preloader.
  const cards = getSelectedWorks().slice(0, 5).map(coverImage);
  return (
    <html lang={site.lang} className={`js ${mono.variable}`}>
      <body>
        <Nav
          brand={site.nav.brand}
          links={site.nav.links}
          clock={
            <Clock
              className="nav__clock"
              label={site.visit.clock.label}
              aria={site.visit.clock.aria}
              timeZone={site.visit.clock.timeZone}
            />
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
