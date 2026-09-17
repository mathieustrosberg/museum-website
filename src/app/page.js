import { getImageProps } from "next/image";
import Footer from "@/components/Footer";
import { Info, TextList } from "@/components/Info";
import JsonLd from "@/components/JsonLd";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import SelectedWorks from "@/features/home/SelectedWorks";
import { coverImage, getSelectedWorks, site } from "@/lib/content";
import { museumJsonLd } from "@/lib/metadata";
import { getVisitInfo } from "@/lib/tickets";

export const metadata = {
  title: { absolute: `${site.name} — ${site.tagline}` },
  description: site.meta.home,
  alternates: { canonical: "/" },
};

/** Largeur du panneau image (grid-2) : pleine largeur sur mobile, une colonne sur deux au-delà. */
const PREVIEW_SIZES = "(max-width: 767px) 100vw, 50vw";

/**
 * Home (Server Component, prérendue). La rangée haute est du contenu statique ;
 * la rangée basse est confiée à SelectedWorks (client) pour l'aperçu au survol,
 * avec un index sérialisable de la sélection (site.json). Chaque aperçu est
 * l'ensemble de candidats produit par getImageProps (next/image) : le
 * navigateur charge la taille du panneau, jamais l'original de l'API.
 */
export default async function HomePage() {
  const { home } = site;
  const [selected, visit] = await Promise.all([
    getSelectedWorks(),
    getVisitInfo(),
  ]);
  const works = selected.map((work) => {
    const { src, width, height } = coverImage(work);
    const { props } = getImageProps({
      src,
      width,
      height,
      alt: "",
      sizes: PREVIEW_SIZES,
    });
    return {
      slug: work.slug,
      year: work.year,
      title: work.title,
      type: work.type,
      location: work.location,
      preview: { src: props.src, srcSet: props.srcSet, sizes: props.sizes },
      color: Boolean(work.color),
    };
  });

  return (
    <PageReveal>
      <JsonLd data={museumJsonLd(visit)} />
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
