"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, MIN_PASSWORD_LENGTH } from "@/lib/auth";
import { site } from "@/lib/content";

/**
 * Connexion, inscription et déconnexion (Server Actions). Les
 * formulaires les appellent via useActionState : Better Auth est l'autorité de
 * validation (le client ne fait que pré-valider) et pose le cookie de session
 * dans la réponse de l'action (plugin nextCookies). Sur succès, redirection
 * vers la page demandée (`next`, un chemin du site) ou vers le compte ; sur
 * refus, les codes d'erreur de Better Auth sont traduits avec les messages du site.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Code Better Auth → champ et message du site. */
const CODES = {
  INVALID_EMAIL: ["email", "email"],
  INVALID_EMAIL_OR_PASSWORD: ["generic", "credentials"],
  PASSWORD_TOO_SHORT: ["password", "passwordShort"],
  USER_ALREADY_EXISTS: ["email", "exists"],
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: ["email", "exists"],
};

function field(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

/** Destination après connexion : un chemin du site seulement (jamais une autre origine). */
function destination(formData) {
  const next = String(formData.get("next") ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

function translate(error) {
  const { errors } = site.account;
  const known = error instanceof APIError && CODES[error.body?.code];
  if (!known) return { generic: errors.generic };
  const [key, message] = known;
  return { [key]: errors[message] };
}

export async function signIn(_previous, formData) {
  const { errors: messages } = site.account;
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const errors = {};
  if (!EMAIL.test(email)) errors.email = messages.email;
  if (!password) errors.password = messages.password;
  if (Object.keys(errors).length) return { ok: false, errors };

  try {
    const auth = await getAuth();
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    return { ok: false, errors: translate(error) };
  }
  redirect(destination(formData));
}

export async function signUp(_previous, formData) {
  const { errors: messages } = site.account;
  const name = field(formData, "name");
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const errors = {};
  if (!name) errors.name = messages.name;
  if (!EMAIL.test(email)) errors.email = messages.email;
  if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = messages.passwordShort;
  if (Object.keys(errors).length) return { ok: false, errors };

  try {
    const auth = await getAuth();
    await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
  } catch (error) {
    return { ok: false, errors: translate(error) };
  }
  redirect(destination(formData));
}

export async function signOut() {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
