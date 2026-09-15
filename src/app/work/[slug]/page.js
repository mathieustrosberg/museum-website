import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import SiteImage from "@/components/SiteImage";
import WorkCard from "@/components/WorkCard";
import {
  artistName,
  coverImage,
  getSimilarWorks,
  getWork,
  getWorks,
  imageSize,
  site,
} from "@/lib/content";

/** Les 12 pages œuvre sont générées au build (SSG) à partir des slugs connus. */
export function generateStaticParams() {
  return getWorks().map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) return {};
  return {
    title: work.title,
    description: `${work.title}, ${artistName(work)}, ${work.technique}, ${work.year}.`,
  };
}

/** Page œuvre (Server Component) : couverture sticky, cartel, feuilles, œuvres similaires. */
export default async function WorkPage({ params }) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) notFound();

  const { cartel } = site.work;
  const artist = artistName(work);
  const cover = work.images[0];
  const alt = `${work.title}, ${artist}, ${work.year}`;

  return (
    <PageReveal>
      <section className="project">
        <div
          className="project__cover"
          data-reveal="scale"
          data-scale="0.95"
          data-delay="0.5"
          data-duration="0.6"
        >
          <div className="media">
            <SiteImage src={cover} alt={alt} {...imageSize(cover)} />
          </div>
        </div>

        <div className="project__content">
          <div className="project__grid">
            <div className="project__body">
              <Link
                className="link-underline"
                href="/work"
                data-reveal="fade-up"
                data-y="20"
                data-delay="0.2"
              >
                {site.work.allWorks}
              </Link>

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
                  <Lines>{work.technique}</Lines>
                </div>
                <div className="info">
                  <Lines className="label">{cartel.year}</Lines>
                  <p
                    data-reveal="fade-up"
                    data-y="12"
                    data-delay="0.6"
                    data-duration="0.4"
                  >
                    {work.year}
                  </p>
                </div>
                <div className="info">
                  <Lines className="label">{cartel.dimensions}</Lines>
                  <Lines>{work.dimensions}</Lines>
                </div>
                <div className="info">
                  <Lines className="label">{cartel.sheets}</Lines>
                  <Lines>{String(work.sheets)}</Lines>
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
                    {work.text}
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
                {work.images.map((src, i) => (
                  <div
                    key={src}
                    className={i === 0 ? "media project__stack-cover" : "media"}
                  >
                    <SiteImage
                      src={src}
                      alt={`${alt}, sheet ${i + 1}`}
                      lazy={i > 0}
                      {...imageSize(src)}
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
                  {getSimilarWorks(work).map((similar) => (
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
