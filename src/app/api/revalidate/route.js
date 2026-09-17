import { revalidateTag } from "next/cache";

/**
 * Invalidation ciblée du cache (Cache Components). À appeler après une mise à
 * jour des données de l'API : POST /api/revalidate?tag=works avec
 * l'en-tête Authorization: Bearer <REVALIDATE_SECRET>. Le tag est l'un de ceux
 * posés par lib/api.js (works, archive, visit, work:<slug>…) ; la
 * prochaine requête reçoit la version en cache et déclenche la revalidation.
 */
const TAGS = /^(works|archive|visit|work:[\w-]+|archive:[\w-]+)$/;

export async function POST(request) {
  const secret = process.env.REVALIDATE_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tag = new URL(request.url).searchParams.get("tag") ?? "";
  if (!TAGS.test(tag))
    return Response.json({ error: "Unknown tag" }, { status: 400 });

  revalidateTag(tag, "max");
  return Response.json({ revalidated: true, tag });
}
