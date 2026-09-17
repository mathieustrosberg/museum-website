import Link from "next/link";
import FavoriteButton from "@/features/favorites/FavoriteButton";
import { getSession } from "@/lib/auth";
import { site } from "@/lib/content";
import { isFavorite } from "@/lib/favorites";

/**
 * Favori d'une fiche (Server Component, derrière <Suspense> : lit la
 * session). Compte connecté : le bouton avec l'état enregistré ; sinon un lien
 * vers la connexion, qui ramène à la fiche une fois connecté.
 */
export default async function FavoriteToggle({ slug, ...attrs }) {
  const session = await getSession();
  const labels = site.favorites;
  if (!session) {
    return (
      <Link
        className="link-underline"
        href={`/login?next=${encodeURIComponent(`/work/${slug}`)}`}
        {...attrs}
      >
        {labels.add}
      </Link>
    );
  }
  return (
    <FavoriteButton
      slug={slug}
      initial={await isFavorite(session.user.id, slug)}
      labels={labels}
      {...attrs}
    />
  );
}
