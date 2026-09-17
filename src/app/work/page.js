import Footer from "@/components/Footer";
import PageReveal from "@/components/PageReveal";
import CollectionBrowser from "@/features/collection/CollectionBrowser";
import {
  coverImage,
  getLocations,
  getMediums,
  getWorks,
  site,
} from "@/lib/content";

export const metadata = {
  title: site.titles.collection,
  description: site.meta.collection,
  alternates: { canonical: "/work" },
};

/**
 * Collection (Server Component, prérendue). La page lit la collection et passe
 * au CollectionBrowser (client) un index sérialisable : slug, titre, année,
 * image dimensionnée, type, catégorie (tableau ou espace), lieu, texte de
 * recherche.
 * La grille est filtrable, elle vit donc dans le composant client ; le footer
 * reste un Server Component passé en prop.
 */
export default async function CollectionPage() {
  const works = (await getWorks()).map((work) => {
    const artist = work.artist;
    return {
      slug: work.slug,
      title: work.title,
      year: work.year,
      image: coverImage(work),
      medium: work.type,
      category: work.category,
      location: work.location,
      haystack: `${work.title} ${artist} ${work.type} ${work.year ?? ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    };
  });

  return (
    <PageReveal>
      <section className="work">
        <CollectionBrowser
          works={works}
          mediums={await getMediums()}
          locations={await getLocations()}
          labels={site.collection}
          footer={<Footer delay="1.5" />}
        />
      </section>
    </PageReveal>
  );
}
