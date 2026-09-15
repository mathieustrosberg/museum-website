/**
 * Billetterie : configuration et jours d'ouverture à venir.
 * Module serveur. Les jours dépendent de la date du jour : la liste est
 * calculée dans un scope "use cache" revalidé toutes les heures (Cache
 * Components) ; elle fait donc partie du shell statique et se rafraîchit seule.
 * Quand l'API existera, getOpenDays() lira les disponibilités depuis l'API
 * avec les mêmes directives.
 */
import "server-only";
import { cacheLife } from "next/cache";
import config from "@/data/tickets.json";

export { config as ticketsConfig };

const TIME_ZONE = "Europe/Berlin";

/** Date civile (YYYY-MM-DD) d'un instant, dans le fuseau du musée. */
function isoDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

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

/** Jours d'ouverture des prochaines semaines : [{ value: "2026-09-17", label: "Thu 17 Sept 2026" }] */
export async function getOpenDays() {
  "use cache";
  cacheLife("hours");

  const today = new Date(isoDate(new Date()));
  const closed = new Set(config.closedDates);
  const days = [];
  for (let i = 0; i < config.weeksAhead * 7; i++) {
    const day = new Date(today.getTime() + i * 86400000);
    const value = day.toISOString().slice(0, 10);
    if (!config.openWeekdays.includes(day.getUTCDay()) || closed.has(value))
      continue;
    days.push({ value, label: formatDay(value) });
  }
  return days;
}
