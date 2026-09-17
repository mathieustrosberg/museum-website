import Image from "next/image";

/**
 * Image du site via next/image. Les photographies viennent soit de l'API
 * (collection et archive, images.remotePatterns), soit du dossier public du
 * site (accueil, À propos, Visite). Next.js
 * les redimensionne et les convertit (WebP, AVIF) à la demande, selon `sizes`.
 * Les dimensions intrinsèques viennent des données, donc aucun layout shift.
 * `color` retire le filtre noir et blanc du site : réservé aux œuvres et aux
 * photographies d'auteur (classe `is-color`, voir media.css). `contain`
 * inscrit l'image entière dans son cadre au lieu de la recadrer (tableaux,
 * classe `is-contained`).
 */
export default function SiteImage({
  src,
  alt,
  width,
  height,
  lazy = false,
  color = false,
  contain = false,
  className,
  sizes = "(max-width: 767px) 100vw, 50vw",
  ...props
}) {
  const classes = [
    className,
    color ? "is-color" : null,
    contain ? "is-contained" : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={lazy ? "lazy" : "eager"}
      className={classes || undefined}
      {...props}
    />
  );
}
