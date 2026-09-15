import Link from "next/link";
import SiteImage from "@/components/SiteImage";
import { imageSize } from "@/lib/content";

/** Vignette d'archive : cellule 3:4, image portrait ou paysage. */
export default function ArchiveTile({ entry, lazy = false }) {
  const landscape = entry.orientation === "landscape";
  return (
    <Link
      className={landscape ? "tile tile--landscape" : "tile"}
      href={`/archive/${entry.slug}`}
    >
      <SiteImage
        src={entry.image}
        alt={entry.caption}
        lazy={lazy}
        {...imageSize(entry.image)}
      />
    </Link>
  );
}
