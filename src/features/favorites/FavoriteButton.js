"use client";

import { useActionState } from "react";
import { toggleFavorite } from "@/features/favorites/actions";

/**
 * Bouton « Ajouter aux favoris » / « Retirer des favoris » d'une fiche, pour
 * un compte connecté. Client Component : la Server Action toggleFavorite est
 * soumise par le formulaire (useActionState, donc aussi sans JavaScript) ; le
 * libellé bascule dès l'envoi, puis suit la réponse du serveur.
 */
export default function FavoriteButton({ slug, initial, labels, ...attrs }) {
  const [state, formAction, pending] = useActionState(toggleFavorite, {
    favorite: initial,
  });
  const shown = pending ? !state.favorite : state.favorite;

  return (
    <form action={formAction} {...attrs}>
      <input type="hidden" name="slug" value={slug} />
      <button
        className="link-underline"
        type="submit"
        aria-pressed={shown}
        disabled={pending}
      >
        {shown ? labels.remove : labels.add}
      </button>
    </form>
  );
}
