import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import SiteImage from "@/components/SiteImage";
import { archiveImage, getArchive, getArchiveEntry, site } from "@/lib/content";
import {
  breadcrumbJsonLd,
  excerpt,
  OPEN_GRAPH,
  photoJsonLd,
  shareImage,
} from "@/lib/metadata";

/** Les pages d'archive sont générées au build (SSG) à partir des slugs de l'API. */
export async function generateStaticParams() {
  return (await getArchive()).map((entry) => ({ slug: entry.slug }));
}

/** Métadonnées de l'entrée : description = légende, image de partage = la photographie, à son orientation. */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const entry = await getArchiveEntry(slug);
  if (!entry) return {};
  const { src, width, height } = archiveImage(entry);
  return {
    title: entry.title,
    description: excerpt(entry.description),
    alternates: { canonical: `/archive/${slug}` },
    openGraph: {
      ...OPEN_GRAPH,
      images: [shareImage(src, entry.description, { width, height })],
    },
  };
}

/** Entrée d'archive (Server Component) : image centrée sur fond gris, titre et date. */
export default async function ArchiveEntryPage({ params }) {
  const { slug } = await params;
  const entry = await getArchiveEntry(slug);
  if (!entry) notFound();

  const { detail } = site.archive;
  const image = archiveImage(entry);
  const share = shareImage(image.src, entry.description, image);

  return (
    <PageReveal>
      <JsonLd data={photoJsonLd(entry, share)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: site.titles.archive, path: "/archive" },
          { name: entry.title, path: `/archive/${entry.slug}` },
        ])}
      />
      <section className="archive-detail">
        <div className="archive-detail__media-col">
          <div
            className="archive-detail__box"
            data-reveal="scale"
            data-scale="0.95"
            data-delay="0.5"
            data-duration="0.6"
          >
            <SiteImage
              alt={entry.description}
              color={entry.color}
              {...archiveImage(entry)}
            />
          </div>
        </div>

        <div className="archive-detail__side">
          <Link
            className="link-underline"
            href="/archive"
            data-reveal="fade-up"
            data-y="20"
            data-delay="0.2"
          >
            {site.archive.allArchive}
          </Link>

          <div className="archive-detail__center">
            <div className="grid-2 archive-detail__meta">
              <div className="info">
                <Lines className="label">{detail.title}</Lines>
                <h1 data-reveal="fade-up" data-y="12" data-delay="0.5">
                  {entry.title}
                </h1>
              </div>
              <div className="info">
                <Lines className="label">{detail.date}</Lines>
                <p
                  data-reveal="fade-up"
                  data-y="12"
                  data-delay="0.4"
                  data-duration="0.4"
                >
                  {entry.date}
                </p>
              </div>
            </div>
          </div>

          <Footer delay="1.5" />
        </div>
      </section>
    </PageReveal>
  );
}
