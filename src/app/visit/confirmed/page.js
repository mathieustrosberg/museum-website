import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import { Info, TextList } from "@/components/Info";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import { site } from "@/lib/content";
import { formatDay, getTicketsConfig, REFERENCE } from "@/lib/tickets";

export const metadata = {
  title: site.titles.confirmed,
  description: site.meta.confirmed,
  robots: { index: false },
};

/**
 * Confirmation d'une demande de billets. Le récapitulatif dépend de l'URL
 * (searchParams : référence, date, quantités) : c'est une donnée de requête,
 * rendue dans un composant async derrière <Suspense>. Le reste de la page est
 * le shell statique (Partial Prerendering). Une URL incomplète renvoie à Visit.
 */
export default async function ConfirmedPage({ searchParams }) {
  const { confirmed } = site.tickets;
  return (
    <PageReveal>
      <section className="page confirmed">
        <div className="grid-2">
          <div className="confirmed__main">
            <Lines as="h1" className="label label--strong">
              {confirmed.title}
            </Lines>
            <Lines split className="prose">
              {confirmed.text}
            </Lines>
            <Suspense
              fallback={<div className="confirmed__summary" aria-busy="true" />}
            >
              <Summary searchParams={searchParams} />
            </Suspense>
            <div className="confirmed__links">
              <Link
                className="link-underline"
                href="/visit"
                data-reveal="fade-up"
                data-y="20"
                data-delay="0.5"
              >
                {confirmed.links.again}
              </Link>
              <Link
                className="link-underline"
                href="/"
                data-reveal="fade-up"
                data-y="20"
                data-delay="0.6"
              >
                {confirmed.links.home}
              </Link>
            </div>
          </div>

          <div className="confirmed__aside">
            <Info label={confirmed.next.label}>
              <TextList items={confirmed.next.items} />
            </Info>
          </div>
        </div>
      </section>

      <Footer page delay="0.9" />
    </PageReveal>
  );
}

/** Récapitulatif lu dans l'URL et recalculé (les prix viennent des données, pas de l'URL). */
async function Summary({ searchParams }) {
  const [params, config] = await Promise.all([
    searchParams,
    getTicketsConfig(),
  ]);
  const ref = String(params.ref ?? "");
  const date = String(params.date ?? "");
  const lines = config.types
    .map((type) => ({
      ...type,
      quantity: Number.parseInt(String(params[type.id] ?? "0"), 10) || 0,
    }))
    .filter((line) => line.quantity > 0 && line.quantity <= config.maxPerType);
  if (
    !REFERENCE.test(ref) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    lines.length === 0
  )
    redirect("/visit");

  const { summary } = site.tickets.confirmed;
  const total = lines.reduce(
    (sum, line) => sum + line.quantity * line.price,
    0,
  );
  const money = (amount) => `${config.currency}${amount}`;

  return (
    <dl
      className="confirmed__summary"
      data-reveal="fade-up"
      data-y="12"
      data-delay="0.4"
      data-duration="0.4"
    >
      <dt className="label">{summary.reference}</dt>
      <dd className="confirmed__reference">{ref}</dd>
      <dt className="label">{summary.date}</dt>
      <dd>{formatDay(date)}</dd>
      <dt className="label">{summary.tickets}</dt>
      <dd>
        {lines.map((line) => (
          <span key={line.id} className="confirmed__line">
            {line.quantity} × {line.label}
            {line.price ? `, ${money(line.price)}` : ""}
          </span>
        ))}
      </dd>
      <dt className="label">{summary.total}</dt>
      <dd>{money(total)}</dd>
    </dl>
  );
}
