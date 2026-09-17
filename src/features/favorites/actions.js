"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWork } from "@/lib/content";
import {
  removeFavorite as remove,
  toggleFavorite as toggle,
} from "@/lib/favorites";

/**
 * Favoris du compte connecté (Server Actions, via useActionState : le slug
 * vient du formulaire). Sans session, renvoi vers la connexion.
 * - toggleFavorite : bouton d'une fiche, rend le nouvel état.
 * - removeFavorite : « Retirer » d'une carte des pages Compte et Favoris.
 */
export async function toggleFavorite(_previous, formData) {
  const slug = String(formData.get("slug") ?? "");
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/work/${slug}`)}`);
  if (!(await getWork(slug))) return { favorite: false };
  return { favorite: await toggle(session.user.id, slug) };
}

export async function removeFavorite(_previous, formData) {
  const slug = String(formData.get("slug") ?? "");
  const session = await getSession();
  if (!session) redirect("/login?next=/favorites");
  await remove(session.user.id, slug);
  return { removed: slug };
}
