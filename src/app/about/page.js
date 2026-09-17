import Footer from "@/components/Footer";
import { Info, TextList } from "@/components/Info";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import SiteImage from "@/components/SiteImage";
import { site } from "@/lib/content";

export const metadata = {
  title: site.titles.about,
  description: site.meta.about,
  alternates: { canonical: "/about" },
};

/** About (Server Component, prérendue) : texte à gauche, deux images à droite. */
export default function AboutPage() {
  const { about } = site;
  const [big, small] = about.images;

  return (
    <PageReveal>
      <section className="about">
        <div className="about__text">
          <Lines as="h1" className="label label--strong">
            {about.title}
          </Lines>

          <div className="about__prose">
            {about.paragraphs.map((text) => (
              <Lines key={text} split className="prose">
                {text}
              </Lines>
            ))}
          </div>

          <div className="about__lists">
            {about.lists.map((list) => (
              <Info key={list.label} label={list.label} labelAs="h2">
                <TextList items={list.items} />
              </Info>
            ))}
          </div>
        </div>

        <div className="about__media">
          <div
            className="media about__big"
            data-reveal="scale"
            data-scale="0.95"
            data-delay="0.7"
            data-duration="0.6"
          >
            <SiteImage
              src={big.src}
              alt={big.alt}
              width={big.width}
              height={big.height}
            />
          </div>
          <div className="about__small">
            <div
              className="media"
              data-reveal="scale"
              data-scale="0.95"
              data-delay="0.5"
              data-duration="0.6"
            >
              <SiteImage
                src={small.src}
                alt={small.alt}
                width={small.width}
                height={small.height}
              />
            </div>
          </div>
        </div>
      </section>

      <Footer page delay="1.1" />
    </PageReveal>
  );
}
