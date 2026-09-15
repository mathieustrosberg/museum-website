"use client";

import Link from "next/link";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import site from "@/data/site.json";

/**
 * Erreur de rendu d'une route (par exemple API injoignable sans cache
 * disponible). Client Component par contrat de Next.js ; il lit ses textes dans
 * site.json et propose de réessayer le rendu.
 */
export default function ErrorPage({ reset }) {
  const { error } = site;
  return (
    <PageReveal className="page-fill" skipPreloader>
      <section className="page">
        <div className="info">
          <Lines as="h1" className="label label--strong">
            {error.label}
          </Lines>
          <Lines split className="prose">
            {error.text}
          </Lines>
          <div className="confirmed__links">
            <button
              type="button"
              className="link-underline"
              onClick={() => reset()}
              data-reveal="fade-up"
              data-y="20"
              data-delay="0.4"
            >
              {error.retry}
            </button>
            <Link
              className="link-underline"
              href="/"
              data-reveal="fade-up"
              data-y="20"
              data-delay="0.5"
            >
              {error.home}
            </Link>
          </div>
        </div>
      </section>
    </PageReveal>
  );
}
