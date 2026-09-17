/**
 * Billetterie : configuration et jours d'ouverture, lus depuis l'API (/visit).
 * Module serveur. La réponse est un scope "use cache" revalidé toutes les
 * heures (lib/api.js) : la liste des jours fait partie du shell statique et se
 * rafraîchit seule.
 */
import "server-only";
import { fetchVisit } from "@/lib/api";

const labelFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Libellé d'une date civile ISO : « jeu. 17 sept. 2026 ». */
export function formatDay(iso) {
  return labelFormat.format(new Date(`${iso}T00:00:00Z`));
}

/** Référence émise par l'API, affichée telle quelle : format opaque (majuscules, chiffres, tirets). */
export const REFERENCE = /^[A-Z0-9-]{8,32}$/;

/** Informations pratiques de la Fondation (nom, adresse, contact, horaires), pour les données structurées. */
export async function getVisitInfo() {
  const { days, admission, maxPerType, currency, ...info } = await fetchVisit();
  return info;
}

/** Configuration de la billetterie : types de billets, devise, maximum par type. */
export async function getTicketsConfig() {
  const visit = await fetchVisit();
  return {
    types: visit.admission,
    currency: visit.currency,
    maxPerType: visit.maxPerType,
  };
}

/** Jours d'ouverture des prochaines semaines : [{ value: "2026-09-17", label: "jeu. 17 sept. 2026" }] */
export async function getOpenDays() {
  const visit = await fetchVisit();
  return visit.days;
}
