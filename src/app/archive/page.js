import ArchiveTile from "@/components/ArchiveTile";
import Footer from "@/components/Footer";
import { Info, TextList } from "@/components/Info";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import { getArchive, site } from "@/lib/content";

export const metadata = {
  title: site.titles.archive,
  description: site.meta.archive,
  alternates: { canonical: "/archive" },
};

/** Archive (Server Component, prérendue) : en-tête sur 2 colonnes, grille des photographies de l'API. */
export default async function ArchivePage() {
  const { archive } = site;
  return (
    <PageReveal>
      <section className="archive-head">
        <div className="grid-2">
          <Info label={archive.label}>
            <Lines as="h1" split className="prose">
              {archive.intro}
            </Lines>
          </Info>
          <Info label={archive.logLabel}>
            <TextList items={archive.logItems} />
          </Info>
        </div>
      </section>

      <section className="archive-grid">
        <div
          className="grid-6"
          data-reveal-each="fade-up"
          data-y="60"
          data-delay="0.6"
          data-stagger="0.05"
        >
          {(await getArchive()).map((entry, i) => (
            <ArchiveTile key={entry.slug} entry={entry} lazy={i >= 4} />
          ))}
        </div>
      </section>

      <Footer page delay="1.5" />
    </PageReveal>
  );
}
