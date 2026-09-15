import Image from "next/image";

/**
 * Image du site via next/image. Les photographies viennent du CDN d'Unsplash
 * (images.remotePatterns) : Next.js les redimensionne et les convertit (WebP,
 * AVIF) à la demande, selon `sizes`. Les dimensions intrinsèques (3:4 ou 4:3)
 * viennent des données, donc aucun layout shift.
 */
export default function SiteImage({
  src,
  alt,
  width,
  height,
  lazy = false,
  sizes = "(max-width: 767px) 100vw, 50vw",
  ...props
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={lazy ? "lazy" : "eager"}
      {...props}
    />
  );
}
