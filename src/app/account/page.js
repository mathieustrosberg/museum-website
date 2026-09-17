import { redirect } from "next/navigation";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import { Info } from "@/components/Info";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import SignOutButton from "@/features/account/SignOutButton";
import FavoritesGrid from "@/features/favorites/FavoritesGrid";
import { getSession } from "@/lib/auth";
import { site } from "@/lib/content";
import { savedWorks } from "@/lib/favorites";

export const metadata = {
  title: site.titles.account,
  description: site.meta.account,
  robots: { index: false },
};

const PREVIEW = 4;
const sinceFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Compte connecté (sans session, renvoi vers la connexion). Le titre est le
 * shell statique ; le reste dépend de la session, donc rendu derrière
 * <Suspense> : à gauche l'identité et la déconnexion, à droite les derniers
 * favoris en cartes (retirables sur place) et le lien vers la page Favoris.
 */
export default function AccountPage() {
  return (
    <PageReveal className="page-fill">
      <section className="page account">
        <Lines as="h1" className="label label--strong">
          {site.account.page.title}
        </Lines>
        <Suspense fallback={<div className="grid-2" aria-busy="true" />}>
          <Panel />
        </Suspense>
      </section>
      <Footer page delay="0.9" />
    </PageReveal>
  );
}

async function Panel() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  const { user } = session;
  const texts = site.account.page;
  const saved = await savedWorks(user.id);

  return (
    <div className="grid-2 account__panel">
      <div className="account__column">
        <Info label={texts.name}>
          <Lines>{user.name}</Lines>
        </Info>
        <Info label={texts.email}>
          <Lines>{user.email}</Lines>
        </Info>
        <Info label={texts.since}>
          <Lines>{sinceFormat.format(new Date(user.createdAt))}</Lines>
        </Info>
        <SignOutButton
          label={texts.signOut}
          pendingLabel={texts.signingOut}
          data-reveal="fade-up"
          data-y="20"
          data-delay="0.5"
        />
      </div>

      <div className="account__column">
        <Lines as="h2" className="label">
          {texts.favorites}
        </Lines>
        <FavoritesGrid
          works={saved.slice(0, PREVIEW)}
          total={saved.length}
          labels={{ ...site.favorites, count: texts.count }}
          empty={{ text: texts.count.zero, href: "/work", label: texts.browse }}
          more={{ href: "/favorites", label: texts.viewFavorites }}
          className="grid-2"
          titleAs="h3"
        />
      </div>
    </div>
  );
}
