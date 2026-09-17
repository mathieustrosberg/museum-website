/**
 * Favoris d'un compte : les slugs des fiches de la collection qu'il a
 * enregistrées. Module serveur. Table `favorite` de la base du site (lib/auth.js),
 * une ligne par (compte, slug), supprimée avec le compte. Requêtes Kysely,
 * valables pour le fichier SQLite local comme pour Postgres.
 * Les fiches elles-mêmes restent dans l'API : les pages résolvent les slugs
 * dans la collection en cache (lib/content.js).
 */
import "server-only";
import { sql } from "kysely";
import { DATABASE_TYPE, db, ready } from "@/lib/auth";
import { coverImage, getWorks } from "@/lib/content";

let created = null;

/**
 * Table prête, après celles de Better Auth (clé étrangère vers user). Même
 * schéma dans les deux bases ; seuls le type de date et sa valeur par défaut diffèrent.
 */
function table() {
  created ??= ready().then(() =>
    sql`
      CREATE TABLE IF NOT EXISTS "favorite" (
        "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "slug" TEXT NOT NULL,
        "createdAt" ${
          DATABASE_TYPE === "postgres"
            ? sql.raw("TIMESTAMPTZ NOT NULL DEFAULT now()")
            : sql.raw(
                "TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
              )
        },
        PRIMARY KEY ("userId", "slug")
      )
    `.execute(db),
  );
  return created;
}

/** Slugs enregistrés par un compte, du plus récent au plus ancien. */
export async function listFavorites(userId) {
  await table();
  const rows = await db
    .selectFrom("favorite")
    .select("slug")
    .where("userId", "=", userId)
    .orderBy("createdAt", "desc")
    .execute();
  return rows.map((row) => row.slug);
}

export async function countFavorites(userId) {
  await table();
  const row = await db
    .selectFrom("favorite")
    .select(db.fn.countAll().as("n"))
    .where("userId", "=", userId)
    .executeTakeFirst();
  return Number(row?.n ?? 0);
}

export async function isFavorite(userId, slug) {
  await table();
  const row = await db
    .selectFrom("favorite")
    .select("slug")
    .where("userId", "=", userId)
    .where("slug", "=", slug)
    .executeTakeFirst();
  return Boolean(row);
}

/** Retire la fiche des favoris du compte ; rend le nombre de lignes retirées (0 ou 1). */
export async function removeFavorite(userId, slug) {
  await table();
  const result = await db
    .deleteFrom("favorite")
    .where("userId", "=", userId)
    .where("slug", "=", slug)
    .executeTakeFirst();
  return Number(result.numDeletedRows);
}

/** Ajoute ou retire la fiche ; rend son nouvel état (true = en favori). */
export async function toggleFavorite(userId, slug) {
  if (await removeFavorite(userId, slug)) return false;
  await db.insertInto("favorite").values({ userId, slug }).execute();
  return true;
}

/**
 * Fiches enregistrées par un compte, résolues dans la collection en cache
 * (une fiche retirée de l'API disparaît d'elle-même), sous forme d'index
 * sérialisable pour la grille client : slug, titre, année, image dimensionnée.
 */
export async function savedWorks(userId) {
  const [slugs, works] = await Promise.all([listFavorites(userId), getWorks()]);
  const bySlug = new Map(works.map((work) => [work.slug, work]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter(Boolean)
    .map((work) => ({
      slug: work.slug,
      title: work.title,
      year: work.year,
      image: coverImage(work),
    }));
}
