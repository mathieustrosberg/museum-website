/**
 * Favoris d'un compte : les slugs des fiches de la collection qu'il a
 * enregistrées. Module serveur. Table `favorite` de la base du site (lib/auth.js),
 * une ligne par (compte, slug), supprimée avec le compte.
 * Les fiches elles-mêmes restent dans l'API : les pages résolvent les slugs
 * dans la collection en cache (lib/content.js).
 */
import "server-only";
import { db, ready } from "@/lib/auth";
import { coverImage, getWorks } from "@/lib/content";

let created = null;

/** Table prête, après celles de Better Auth (clé étrangère vers user). */
function table() {
  created ??= ready().then(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS favorite (
        userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        slug TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        PRIMARY KEY (userId, slug)
      )
    `);
  });
  return created;
}

/** Slugs enregistrés par un compte, du plus récent au plus ancien. */
export async function listFavorites(userId) {
  await table();
  return db
    .prepare(
      "SELECT slug FROM favorite WHERE userId = ? ORDER BY createdAt DESC",
    )
    .all(userId)
    .map((row) => row.slug);
}

export async function countFavorites(userId) {
  await table();
  return db
    .prepare("SELECT COUNT(*) AS n FROM favorite WHERE userId = ?")
    .get(userId).n;
}

export async function isFavorite(userId, slug) {
  await table();
  return Boolean(
    db
      .prepare("SELECT 1 FROM favorite WHERE userId = ? AND slug = ?")
      .get(userId, slug),
  );
}

/** Retire la fiche des favoris du compte (sans effet si elle n'y est pas). */
export async function removeFavorite(userId, slug) {
  await table();
  db.prepare("DELETE FROM favorite WHERE userId = ? AND slug = ?").run(
    userId,
    slug,
  );
}

/** Ajoute ou retire la fiche ; rend son nouvel état (true = en favori). */
export async function toggleFavorite(userId, slug) {
  await table();
  const removed = db
    .prepare("DELETE FROM favorite WHERE userId = ? AND slug = ?")
    .run(userId, slug).changes;
  if (removed) return false;
  db.prepare("INSERT INTO favorite (userId, slug) VALUES (?, ?)").run(
    userId,
    slug,
  );
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
