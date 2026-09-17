"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import Lines from "@/components/Lines";
import WorkCard from "@/components/WorkCard";
import { removeFavorite } from "@/features/favorites/actions";

/**
 * Favoris d'un compte : compte, cartes avec « Retirer » sous chacune, état
 * vide. Client Component : une carte retirée disparaît dès l'envoi et le
 * compte suit, pendant que la Server Action removeFavorite enregistre ; le
 * router est ensuite rafraîchi pour que le serveur renvoie la liste à jour
 * (la carte suivante prend la place dans l'aperçu du Compte).
 * `works` est l'index sérialisable des fiches affichées (slug, titre, année,
 * image dimensionnée) ; `total` le nombre de favoris du compte, qui peut
 * dépasser les fiches affichées (aperçu).
 */
const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );

export default function FavoritesGrid({
  works,
  total,
  labels,
  empty,
  more,
  className = "grid-4",
  titleAs = "h2",
}) {
  const router = useRouter();
  const [removed, setRemoved] = useState(() => new Set());
  const shown = works.filter((work) => !removed.has(work.slug));
  // Après le rafraîchissement, le serveur ne renvoie plus les fiches retirées :
  // seules celles encore présentes dans `works` sont déduites du total.
  const count = total - (works.length - shown.length);

  // Une fois par fiche : l'effet de la carte peut rappeler après un nouveau rendu.
  const onRemoved = (slug) => {
    if (removed.has(slug)) return;
    setRemoved((set) => new Set(set).add(slug));
    router.refresh();
  };

  if (count <= 0) {
    return (
      <div className="info">
        <Lines split className="prose">
          {empty.text}
        </Lines>
        <Link
          className="link-underline"
          href={empty.href}
          data-reveal="fade-up"
          data-y="20"
          data-delay="0.4"
        >
          {empty.label}
        </Link>
      </div>
    );
  }

  return (
    <>
      <Lines>
        {count === 1
          ? labels.count.one
          : fill(labels.count.other, { n: count })}
      </Lines>
      <div
        className={className}
        data-reveal-each="fade-up"
        data-y="60"
        data-delay="0.3"
        data-stagger="0.1"
      >
        {shown.map((work, i) => (
          <FavoriteItem
            key={work.slug}
            work={work}
            lazy={i >= 4}
            titleAs={titleAs}
            labels={labels}
            onRemoved={onRemoved}
          />
        ))}
      </div>
      {more ? (
        <Link
          className="link-underline"
          href={more.href}
          data-reveal="fade-up"
          data-y="20"
          data-delay="0.6"
        >
          {more.label}
        </Link>
      ) : null}
    </>
  );
}

/** Carte + « Retirer » : formulaire de la Server Action, masqué dès l'envoi. */
function FavoriteItem({ work, lazy, titleAs, labels, onRemoved }) {
  const [state, formAction, pending] = useActionState(removeFavorite, null);

  useEffect(() => {
    if (state?.removed === work.slug) onRemoved(work.slug);
  }, [state, work.slug, onRemoved]);

  return (
    <div className="favorite" hidden={pending || Boolean(state?.removed)}>
      <WorkCard work={work} image={work.image} lazy={lazy} titleAs={titleAs} />
      <form action={formAction}>
        <input type="hidden" name="slug" value={work.slug} />
        <button
          className="link-underline favorite__remove"
          type="submit"
          aria-label={fill(labels.removeAria, { title: work.title })}
        >
          {labels.removeShort}
        </button>
      </form>
    </div>
  );
}
