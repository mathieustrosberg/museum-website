import Link from "next/link";
import SiteImage from "@/components/SiteImage";
import { archiveImage } from "@/lib/content";

/** Vignette d'archive : cellule 3:4, image portrait ou paysage. */
export default function ArchiveTile({ entry, lazy = false }) {
  const landscape = entry.orientation === "landscape";
  return (
    <Link
      className={landscape ? "tile tile--landscape" : "tile"}
      href={`/archive/${entry.slug}`}
    >
      <SiteImage
        alt={entry.description}
        color={entry.color}
        lazy={lazy}
        sizes="(max-width: 767px) 50vw, (max-width: 1159px) 25vw, 17vw"
        {...archiveImage(entry)}
      />
    </Link>
  );
}
