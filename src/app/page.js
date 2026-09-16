import Footer from "@/components/Footer";
import { Info, TextList } from "@/components/Info";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import SelectedWorks from "@/features/home/SelectedWorks";
import { getSelectedWorks, site } from "@/lib/content";

export const metadata = {
  title: { absolute: `${site.name} — ${site.tagline}` },
  description: site.meta.home,
};

/**
 * Home (Server Component, prérendue). La rangée haute est du contenu statique ;
 * la rangée basse est confiée à SelectedWorks (client) pour l'aperçu au survol,
 * avec un index sérialisable des 8 œuvres sélectionnées.
 */
export default async function HomePage() {
  const { home } = site;
  const works = (await getSelectedWorks()).map((work) => ({
    slug: work.slug,
    year: work.year,
    title: work.title,
    type: work.type,
    location: work.location,
    preview: work.image,
    color: Boolean(work.color),
  }));

  return (
    <PageReveal>
      <section className="page home">
        <div className="grid-4 home__intro">
          {home.intro.map((block) => (
            <Info key={block.label} label={block.label}>
              {block.text ? (
                <Lines as="h1" split className="prose">
                  {block.text}
                </Lines>
              ) : (
                <TextList items={block.items} />
              )}
            </Info>
          ))}
        </div>

        <SelectedWorks
          media={home.media}
          works={works}
          label={home.selectedLabel}
          table={home.table}
          viewAll={home.viewAll}
          footer={<Footer delay="1.5" />}
        />
      </section>
    </PageReveal>
  );
}
