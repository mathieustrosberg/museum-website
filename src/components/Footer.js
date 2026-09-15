import { site } from "@/lib/content";

/** Pied de page : « © 2026 Halbton » ............ « ■ Open Thu–Sun » */
export default function Footer({ page = false, delay = "1.5" }) {
  return (
    <footer
      className={page ? "footer footer--page" : "footer"}
      data-reveal="fade-up"
      data-y="12"
      data-delay={delay}
    >
      <p>{site.footer.copyright}</p>
      <div className="footer__status">
        <span className="footer__dot" aria-hidden="true" />
        <p>{site.footer.status}</p>
      </div>
    </footer>
  );
}
