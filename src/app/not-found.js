import Link from "next/link";
import Footer from "@/components/Footer";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import { site } from "@/lib/content";

export const metadata = { title: site.titles.notFound };

/** Page 404 dans la grammaire du site : label, une phrase, un lien souligné. */
export default function NotFound() {
  const { notFound } = site;
  return (
    <PageReveal className="page-fill" skipPreloader>
      <section className="page">
        <div className="info">
          <Lines as="h1" className="label label--strong">
            {notFound.label}
          </Lines>
          <Lines split className="prose">
            {notFound.text}
          </Lines>
          <Link
            className="link-underline"
            href="/"
            data-reveal="fade-up"
            data-y="20"
            data-delay="0.4"
          >
            {notFound.back}
          </Link>
        </div>
      </section>
      <Footer page delay="0.9" />
    </PageReveal>
  );
}
