import { redirect } from "next/navigation";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import FavoritesGrid from "@/features/favorites/FavoritesGrid";
import { getSession } from "@/lib/auth";
import { site } from "@/lib/content";
import { savedWorks } from "@/lib/favorites";

export const metadata = {
  title: site.titles.favorites,
  description: site.meta.favorites,
  robots: { index: false },
};

/**
 * Favoris du compte connecté. Le titre est le shell statique ; la liste dépend
 * de la session, donc rendue derrière <Suspense>. Sans session, renvoi vers la
 * connexion, qui ramène ici une fois connecté. Les slugs enregistrés sont
 * résolus dans la collection en cache : une fiche retirée de l'API disparaît
 * d'elle-même. La grille (client) permet de retirer une fiche sur place.
 */
export default function FavoritesPage() {
  return (
    <PageReveal className="page-fill">
      <section className="page favorites">
        <Lines as="h1" className="label label--strong">
          {site.favorites.title}
        </Lines>
        <Suspense fallback={<div className="grid-4" aria-busy="true" />}>
          <Favorites />
        </Suspense>
      </section>
      <Footer page delay="0.9" />
    </PageReveal>
  );
}

async function Favorites() {
  const session = await getSession();
  if (!session) redirect("/login?next=/favorites");
  const { favorites } = site;
  const saved = await savedWorks(session.user.id);

  return (
    <FavoritesGrid
      works={saved}
      total={saved.length}
      labels={favorites}
      empty={{
        text: favorites.empty,
        href: "/work",
        label: favorites.allWorks,
      }}
    />
  );
}
