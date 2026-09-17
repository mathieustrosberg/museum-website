/**
 * Comptes : Better Auth, côté serveur uniquement.
 *
 * Les comptes et les favoris vivent dans une base du site, distincte de l'API
 * de la Fondation qui reste la seule source de la collection :
 * - en production, Postgres (Neon via l'intégration Vercel), désigné par
 *   DATABASE_URL (ou POSTGRES_URL) ;
 * - sans DATABASE_URL (développement), un fichier SQLite local
 *   (data/site.sqlite, dossier ignoré par git) par libsql.
 * Les deux passent par un dialecte Kysely : Better Auth et les requêtes du
 * site (favoris) utilisent la même connexion, `DATABASE_TYPE` dit laquelle.
 *
 * Les tables de Better Auth (user, session, account, verification) sont
 * créées à la demande par ses migrations (ready) ; l'instance est créée
 * ensuite (getAuth). Rien n'est ouvert à l'import du module, donc rien au build.
 *
 * Connexion par e-mail et mot de passe. Les Server Actions (features/account)
 * appellent auth.api directement ; le plugin nextCookies pose alors le cookie
 * de session dans la réponse de l'action. Le Route Handler /api/auth/[...all]
 * expose le même service au navigateur.
 */
import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@libsql/client";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { Kysely, PostgresDialect } from "kysely";
import { headers } from "next/headers";
import pg from "pg";
import { SITE_URL } from "@/lib/metadata";

/** Fichier SQLite local par défaut, hors du dépôt. */
const LOCAL_FILE = join(process.cwd(), "data", "site.sqlite");

/** Connexion Postgres : DATABASE_URL, ou POSTGRES_URL (autre nom posé par l'intégration Neon de Vercel). */
const POSTGRES_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

/** "postgres" avec une URL de connexion, sinon "sqlite" (fichier local). */
export const DATABASE_TYPE = POSTGRES_URL ? "postgres" : "sqlite";

function createDialect() {
  if (DATABASE_TYPE === "postgres") {
    // Un petit pool par instance : chaque fonction Vercel a le sien.
    const pool = new pg.Pool({
      connectionString: POSTGRES_URL,
      max: 5,
    });
    return new PostgresDialect({ pool });
  }
  mkdirSync(dirname(LOCAL_FILE), { recursive: true });
  return new LibsqlDialect({
    client: createClient({ url: `file:${LOCAL_FILE}` }),
  });
}

const dialect = createDialect();

/** Requêtes du site (favoris), sur la même connexion que Better Auth. */
export const db = new Kysely({ dialect });

const options = {
  baseURL: SITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: { dialect, type: DATABASE_TYPE },
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  telemetry: { enabled: false },
  // Dernier de la liste : il pose les cookies après les autres plugins.
  plugins: [nextCookies()],
};

/** Longueur minimale du mot de passe, partagée avec la pré-validation du formulaire. */
export const MIN_PASSWORD_LENGTH = options.emailAndPassword.minPasswordLength;

/**
 * Tables de Better Auth créées si elles manquent. Un autre processus (second
 * serveur sur la même base) peut les créer entre l'inspection et la création :
 * dans ce cas, une nouvelle inspection confirme que tout est en place.
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
