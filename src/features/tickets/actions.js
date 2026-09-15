"use server";

import { redirect } from "next/navigation";
import { site } from "@/lib/content";
import { getOpenDays, ticketsConfig } from "@/lib/tickets";

/**
 * Demande de billets (Server Action). Le formulaire l'appelle via useActionState :
 * validation côté serveur (l'autorité, le client ne fait que pré-valider),
 * référence de retrait, puis redirection vers la page de confirmation. Aucune
 * persistance pour le moment : quand l'API existera, la demande validée lui
 * sera transmise ici (POST) et la référence viendra de sa réponse.
 * L'URL de confirmation ne porte que la référence, la date et les quantités,
 * jamais le nom ni l'email.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reference(date) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++)
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `HB-${date.replaceAll("-", "").slice(2)}-${code}`;
}

export async function requestTickets(_previous, formData) {
  const { errors: messages } = site.tickets;
  const errors = {};

  const date = String(formData.get("date") ?? "");
  const days = await getOpenDays();
  if (!days.some((d) => d.value === date)) errors.date = messages.date;

  const quantities = {};
  let count = 0;
  for (const type of ticketsConfig.types) {
    const quantity =
      Number.parseInt(String(formData.get(`qty-${type.id}`) ?? "0"), 10) || 0;
    if (quantity < 0 || quantity > ticketsConfig.maxPerType)
      errors.tickets = messages.max;
    if (quantity > 0) quantities[type.id] = quantity;
    count += quantity;
  }
  if (!errors.tickets && count === 0) errors.tickets = messages.tickets;

  if (!String(formData.get("name") ?? "").trim()) errors.name = messages.name;
  if (!EMAIL.test(String(formData.get("email") ?? "").trim()))
    errors.email = messages.email;

  if (Object.keys(errors).length) return { ok: false, errors };

  const params = new URLSearchParams({
    ref: reference(date),
    date,
    ...quantities,
  });
  redirect(`/visit/confirmed?${params}`);
}
