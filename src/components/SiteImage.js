import Image from "next/image";

/**
 * Image du site via next/image. `unoptimized` : les placeholders sont des PNG
 * tramés 1 bit, un ré-encodage WebP redimensionné flouterait la trame. Les
 * dimensions intrinsèques viennent de src/data/images.json (aucun layout shift).
 * Le jour où de vraies photographies remplacent les placeholders, retirer
 * `unoptimized` suffit pour bénéficier de l'optimisation.
 */
export default function SiteImage({
  src,
  alt,
  width,
  height,
  lazy = false,
  ...props
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? "lazy" : "eager"}
      unoptimized
      {...props}
    />
  );
}
