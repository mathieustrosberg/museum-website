/**
 * Client de l'API Halbton (museum-api). Module serveur uniquement.
 *
 * Chaque lecture est un scope "use cache" (Cache Components) : le résultat est
 * mis en cache au build puis revalidé en arrière-plan toutes les heures
 * (cacheLife("hours")) ; les tags permettent une invalidation ciblée
 * (revalidateTag depuis /api/revalidate). Si l'API est injoignable au moment
 * d'une revalidation, la version en cache continue d'être servie.
 *
 * L'URL de base vient de HALBTON_API_URL (déploiement Vercel de museum-api) ;
 * en local, l'API tourne sur http://localhost:4000 (npm run dev dans museum-api).
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export const API_URL = (
  process.env.HALBTON_API_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

/** GET JSON ; null pour un 404 (slug inconnu), erreur pour tout autre échec. */
async function get(path) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API ${path}: ${response.status}`);
  return response.json();
}

export async function fetchWorks() {
  "use cache";
  cacheLife("hours");
  cacheTag("works");
  return get("/objects");
}

export async function fetchWork(slug) {
  "use cache";
  cacheLife("hours");
  cacheTag("works", `work:${slug}`);
  return get(`/objects/${encodeURIComponent(slug)}`);
}

export async function fetchArchive() {
  "use cache";
  cacheLife("hours");
  cacheTag("archive");
  return get("/archive");
}

export async function fetchArchiveEntry(slug) {
  "use cache";
  cacheLife("hours");
  cacheTag("archive", `archive:${slug}`);
  return get(`/archive/${encodeURIComponent(slug)}`);
}

export async function fetchExhibitions() {
  "use cache";
  cacheLife("hours");
  cacheTag("exhibitions");
  return get("/exhibitions");
}

/** Informations de visite et jours d'ouverture à venir (la liste change chaque jour). */
export async function fetchVisit() {
  "use cache";
  cacheLife("hours");
  cacheTag("visit");
  return get("/visit");
}

/**
 * Demande de billets (POST, jamais mise en cache). Retourne
 * { status, body } ; le corps porte la référence (201) ou les codes d'erreur
 * par champ (400).
 */
export async function postTickets(request) {
  const response = await fetch(`${API_URL}/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  });
  return { status: response.status, body: await response.json() };
}
