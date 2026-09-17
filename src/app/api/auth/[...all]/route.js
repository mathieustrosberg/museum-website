import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

/**
 * Service Better Auth pour le navigateur (/api/auth/*). Les formulaires du
 * site passent par des Server Actions et n'en ont pas besoin ; la route reste
 * l'entrée standard de Better Auth (session, déconnexion) pour un client.
 */
async function handler() {
  return toNextJsHandler(await getAuth());
}

export async function GET(request) {
  return (await handler()).GET(request);
}

export async function POST(request) {
  return (await handler()).POST(request);
}
