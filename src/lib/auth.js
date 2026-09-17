/**
 * Comptes : Better Auth, côté serveur uniquement.
 *
 * Les comptes et les favoris vivent dans une base SQLite locale
 * (better-sqlite3, fichier data/site.sqlite), en dehors de l'API de la
 * Fondation, qui reste la seule source de la collection. Le fichier est créé
 * au premier démarrage ; ses tables (user, session, account, verification)
 * sont celles de Better Auth, créées à la demande par ses migrations (ready).
 * Pour une autre base (Postgres, Turso…), seule l'option `database` change.
 *
 * Connexion par e-mail et mot de passe. Les Server Actions (features/account)
 * appellent auth.api directement ; le plugin nextCookies pose alors le cookie
 * de session dans la réponse de l'action. Le Route Handler /api/auth/[...all]
 * expose le même service au navigateur.
 */
import "server-only";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/metadata";

/** Dossier de la base, hors du dépôt (data/ est ignoré par git). */
const DATA_DIR = join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(join(DATA_DIR, "site.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const options = {
  baseURL: SITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: db,
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  telemetry: { enabled: false },
  // Dernier de la liste : il pose les cookies après les autres plugins.
  plugins: [nextCookies()],
};

/** Longueur minimale du mot de passe, partagée avec la pré-validation du formulaire. */
export const MIN_PASSWORD_LENGTH = options.emailAndPassword.minPasswordLength;

/**
 * Tables de Better Auth créées si elles manquent. Un autre processus (build,
 * second serveur sur le même fichier) peut les créer entre l'inspection et la
 * création : dans ce cas, une nouvelle inspection confirme que tout est en place.
 */
async function migrate() {
  const { toBeCreated, toBeAdded, runMigrations } =
    await getMigrations(options);
  if (toBeCreated.length === 0 && toBeAdded.length === 0) return;
  try {
    await runMigrations();
  } catch (error) {
    const again = await getMigrations(options);
    if (again.toBeCreated.length || again.toBeAdded.length) throw error;
  }
}

let migrated = null;
let instance = null;

/** Base prête : une seule migration par processus, les appels suivants attendent la même promesse. */
export function ready() {
  migrated ??= migrate();
  return migrated;
}

/** Instance Better Auth, créée une fois la base prête (elle vérifie le schéma à sa création). */
export async function getAuth() {
  await ready();
  instance ??= betterAuth(options);
  return instance;
}

/**
 * Session de la requête courante ({ session, user }) ou null. À appeler
 * derrière <Suspense> : la lecture des en-têtes, en premier, sort le rendu du
 * prérendu (au build, la base n'est jamais touchée).
 */
export async function getSession() {
  const requestHeaders = await headers();
  const auth = await getAuth();
  return auth.api.getSession({ headers: requestHeaders });
}
