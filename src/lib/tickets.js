/**
 * Billetterie : configuration et jours d'ouverture, lus depuis l'API (/visit).
 * Module serveur. La réponse est un scope "use cache" revalidé toutes les
 * heures (lib/api.js) : la liste des jours fait partie du shell statique et se
 * rafraîchit seule.
 */
import "server-only";
import { fetchVisit } from "@/lib/api";

const labelFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Libellé d'une date civile ISO : « Thu 17 Sept 2026 ». */
export function formatDay(iso) {
  return labelFormat.format(new Date(`${iso}T00:00:00Z`));
}

/** Format d'une référence de demande : HB-AAMMJJ-XXXX */
export const REFERENCE = /^HB-\d{6}-[A-Z2-9]{4}$/;

/** Configuration de la billetterie : types de billets, devise, maximum par type. */
export async function getTicketsConfig() {
  const visit = await fetchVisit();
  return {
    types: visit.admission,
    currency: visit.currency,
    maxPerType: visit.maxPerType,
  };
}

/** Jours d'ouverture des prochaines semaines : [{ value: "2026-09-17", label: "Thu 17 Sept 2026" }] */
export async function getOpenDays() {
  const visit = await fetchVisit();
  return visit.days;
}
