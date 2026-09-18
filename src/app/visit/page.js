import { cacheLife } from "next/cache";
import Footer from "@/components/Footer";
import { Info, TextList } from "@/components/Info";
import JsonLd from "@/components/JsonLd";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import SiteImage from "@/components/SiteImage";
import TicketForm from "@/features/tickets/TicketForm";
import { site } from "@/lib/content";
import { museumJsonLd } from "@/lib/metadata";
import { getOpenDays, getTicketsConfig, getVisitInfo } from "@/lib/tickets";

export const metadata = {
  title: site.titles.visit,
  description: site.meta.visit,
  alternates: { canonical: "/visit" },
};

/**
 * Visit (Server Component). Le formulaire de la page est la billetterie :
 * la liste des jours d'ouverture dépend de la date du jour, elle vient d'un
 * bloc "use cache" revalidé toutes les heures (Booking) ; la demande passe par
 * une Server Action. Un seul îlot client : le formulaire (l'horloge de Lanzarote est dans le pied de page).
 */
export default async function VisitPage() {
  const { visit } = site;
  const info = await getVisitInfo();

  return (
    <PageReveal>
      <JsonLd data={museumJsonLd(info)} />
      <section className="contact">
        <div className="grid-2 contact__top">
          <div className="contact__intro">
            <div className="contact__head">
              <Lines as="h1" className="label label--strong">
                {visit.title}
              </Lines>

              <div className="grid-2 contact__form-grid">
                <Booking />
              </div>
            </div>
          </div>

          <div
            className="media contact__media"
            data-reveal="scale"
            data-scale="0.9"
            data-delay="0.5"
            data-duration="0.6"
          >
            <SiteImage
              src={visit.media.src}
              alt={visit.media.alt}
              color={visit.media.color}
              width={visit.media.width}
              height={visit.media.height}
            />
          </div>
        </div>

        <div className="contact__links-row">
          <div className="grid-4 contact__links">
            {visit.blocks.map((block) => (
              <Info key={block.label} label={block.label}>
                {block.links ? (
                  <ul className="list list--tight">
                    {block.links.map((link, i) => (
                      <li key={link.href}>
                        <a
                          className="link"
                          href={link.href}
                          target={link.external ? "_blank" : undefined}
                          rel={link.external ? "noopener" : undefined}
                          data-reveal="fade-up"
                          data-y="12"
                          data-delay={(0.6 + i * 0.1).toFixed(1)}
                        >
                          {link.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : block.items ? (
                  <TextList items={block.items} />
                ) : (
                  <Lines split className="prose">
                    {block.text}
                  </Lines>
                )}
              </Info>
            ))}
          </div>
        </div>
      </section>

      <Footer page delay="0.9" />
    </PageReveal>
  );
}

/** Jours d'ouverture à venir, mis en cache une heure (Cache Components). */
async function Booking() {
  "use cache";
  cacheLife("hours");
  const [days, config] = await Promise.all([getOpenDays(), getTicketsConfig()]);
  return (
    <TicketForm
      days={days}
      types={config.types}
      currency={config.currency}
      maxPerType={config.maxPerType}
      labels={site.tickets.form}
      messages={site.tickets.errors}
    />
  );
}
