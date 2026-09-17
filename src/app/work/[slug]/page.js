import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import SiteImage from "@/components/SiteImage";
import WorkCard from "@/components/WorkCard";
import FavoriteToggle from "@/features/favorites/FavoriteToggle";
import {
  coverImage,
  getSimilarWorks,
  getWork,
  getWorks,
  sheetSize,
  site,
  workImages,
} from "@/lib/content";
import {
  breadcrumbJsonLd,
  excerpt,
  OPEN_GRAPH,
  shareImage,
  workJsonLd,
} from "@/lib/metadata";

/** Les fiches de la collection sont générées au build (SSG) à partir des slugs de l'API. */
export async function generateStaticParams() {
  return (await getWorks()).map((work) => ({ slug: work.slug }));
}

/** Métadonnées de la fiche : description = début de la notice, image de partage = photographie de couverture. */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const work = await getWork(slug);
  if (!work) return {};
  const alt = [work.title, work.artist, work.year].filter(Boolean).join(", ");
  return {
    title: work.title,
    description: excerpt(work.description),
    alternates: { canonical: `/work/${slug}` },
    openGraph: {
      ...OPEN_GRAPH,
      images: [shareImage(work.image, alt, sheetSize(work))],
    },
  };
}

/**
 * Page œuvre (Server Component) : couverture sticky, cartel, feuilles, œuvres
 * similaires. Le favori dépend de la session : c'est le seul trou dynamique de
 * la fiche (Suspense), le reste est le shell statique.
 */
export default async function WorkPage({ params }) {
  const { slug } = await params;
  const work = await getWork(slug);
  if (!work) notFound();

  // Libellés du cartel : ceux des œuvres, remplacés pour un espace de la maison.
  const cartel = {
    ...site.work.cartel,
    ...(work.category === "space" ? site.work.cartelSpace : {}),
  };
  const artist = work.artist;
  const images = workImages(work);
  const [cover] = images;
  const alt = [work.title, artist, work.year].filter(Boolean).join(", ");
  const share = shareImage(cover, alt, sheetSize(work));

  return (
    <PageReveal>
      <JsonLd data={workJsonLd(work, share)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: site.titles.collection, path: "/work" },
          { name: work.title, path: `/work/${work.slug}` },
        ])}
      />
      <section className="project">
        <div
          className="project__cover"
          data-reveal="scale"
          data-scale="0.95"
          data-delay="0.5"
          data-duration="0.6"
        >
          <div className="media">
            <SiteImage src={cover} alt={alt} {...sheetSize(work)} />
          </div>
        </div>

        <div className="project__content">
          <div className="project__grid">
            <div className="project__body">
              <div className="project__actions">
                <Link
                  className="link-underline"
                  href="/work"
                  data-reveal="fade-up"
                  data-y="20"
                  data-delay="0.2"
                >
                  {site.work.allWorks}
                </Link>
                <Suspense fallback={null}>
                  <FavoriteToggle
                    slug={work.slug}
                    data-reveal="fade-up"
                    data-y="20"
                    data-delay="0.3"
                  />
                </Suspense>
              </div>

              <div className="project__meta">
                <div className="info">
                  <Lines className="label">{cartel.title}</Lines>
                  <Lines as="h1">{work.title}</Lines>
                </div>
                <div className="info">
                  <Lines className="label">{cartel.artist}</Lines>
                  <Lines>{artist}</Lines>
                </div>
                <div className="info">
                  <Lines className="label">{cartel.medium}</Lines>
                  <Lines>{work.medium}</Lines>
                </div>
                <div className="info">
                  <Lines className="label">{cartel.year}</Lines>
                  <p
                    data-reveal="fade-up"
                    data-y="12"
                    data-delay="0.6"
                    data-duration="0.4"
                  >
                    {work.year ?? site.work.undated}
                  </p>
                </div>
                {work.dimensions ? (
                  <div className="info">
                    <Lines className="label">{cartel.dimensions}</Lines>
                    <Lines>{work.dimensions}</Lines>
                  </div>
                ) : null}
                <div className="info">
                  <Lines className="label">{cartel.location}</Lines>
                  <Lines>{work.location}</Lines>
                </div>
                <div className="info project__notes">
                  <Lines className="label">{cartel.notes}</Lines>
                  <p
                    className="prose"
                    data-reveal="fade-up"
                    data-y="12"
                    data-delay="0.7"
                    data-duration="0.4"
                  >
                    {work.description}
                  </p>
                </div>
              </div>

              <div
                className="project__stack"
                data-reveal-each="fade-up"
                data-y="60"
                data-delay="0.6"
                data-stagger="0.1"
              >
                {images.map((src, i) => (
                  <div
                    key={src}
                    className={i === 0 ? "media project__stack-cover" : "media"}
                  >
                    <SiteImage
                      src={src}
                      alt={`${alt}, vue ${i + 1}`}
                      lazy={i > 0}
                      {...sheetSize(work)}
                    />
                  </div>
                ))}
              </div>

              <div className="info project__related">
                <Lines as="h2" className="label label--strong">
                  {site.work.similarLabel}
                </Lines>
                <div
                  className="grid-2"
                  data-reveal-each="fade-up"
                  data-y="60"
                  data-delay="0.6"
                  data-stagger="0.1"
                >
                  {(await getSimilarWorks(work)).map((similar) => (
                    <WorkCard
                      key={similar.slug}
                      work={similar}
                      image={coverImage(similar)}
                      lazy
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Footer delay="1.5" />
        </div>
      </section>
    </PageReveal>
  );
}
