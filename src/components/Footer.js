import Clock from "@/features/visit/Clock";
import { site } from "@/lib/content";

/** Pied de page : « © 2026 Fondation César Manrique » ............ « [14:09] Heure locale   ■ Ouvert tous les jours » */
export default function Footer({ page = false, delay = "1.5" }) {
  const { clock } = site.visit;
  return (
    <footer
      className={page ? "footer footer--page" : "footer"}
      data-reveal="fade-up"
      data-y="12"
      data-delay={delay}
    >
      <p>{site.footer.copyright}</p>
      <div className="footer__right">
        <Clock
          className="footer__clock"
          label={clock.label}
          aria={clock.aria}
          timeZone={clock.timeZone}
        />
        <div className="footer__status">
          <span className="footer__dot" aria-hidden="true" />
          <p>{site.footer.status}</p>
        </div>
      </div>
    </footer>
  );
}
