import Link from "next/link";
import SiteImage from "@/components/SiteImage";

/**
 * Carte d'œuvre : image 3:4 + légende (année | titre, niveau de titre `titleAs`
 * selon la page : h2 dans la grille de la Collection, h3 sous « À voir aussi »). Composant sans directive :
 * rendu côté serveur dans les œuvres similaires, côté client dans la grille
 * filtrable de la Collection. Reçoit l'image avec ses dimensions (coverImage côté
 * serveur), donc aucune dépendance au module de données.
 */
export default function WorkCard({
  work,
  image,
  lazy = false,
  titleAs: Title = "h3",
  ...attrs
}) {
  return (
    <Link className="card" href={`/work/${work.slug}`} {...attrs}>
      <div className="card__media">
        <SiteImage
          src={image.src}
          alt={work.title}
          color={image.color}
          contain={image.contain}
          lazy={lazy}
          width={image.width}
          height={image.height}
          sizes="(max-width: 767px) 50vw, 25vw"
        />
      </div>
      <div className="card__caption">
        <span className="card__date">{work.year ?? ""}</span>
        <Title className="card__title">{work.title}</Title>
      </div>
    </Link>
  );
}
