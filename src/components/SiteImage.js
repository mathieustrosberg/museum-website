import Image from "next/image";

/**
 * Image du site via next/image. Les photographies viennent soit du CDN
 * d'Unsplash (œuvres de la collection, images.remotePatterns), soit de l'API
 * (archive) ou du dossier public du site (accueil, À propos, Visite). Next.js
 * les redimensionne et les convertit (WebP, AVIF) à la demande, selon `sizes`.
 * Les dimensions intrinsèques viennent des données, donc aucun layout shift.
 * `color` retire le filtre noir et blanc du site : réservé aux œuvres et aux
 * photographies d'auteur (classe `is-color`, voir media.css).
 */
export default function SiteImage({
  src,
  alt,
  width,
  height,
  lazy = false,
  color = false,
  className,
  sizes = "(max-width: 767px) 100vw, 50vw",
  ...props
}) {
  const classes = [className, color ? "is-color" : null]
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
