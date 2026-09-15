"use server";

import { redirect } from "next/navigation";
import { postTickets } from "@/lib/api";
import { site } from "@/lib/content";
import { getTicketsConfig } from "@/lib/tickets";

/**
 * Demande de billets (Server Action). Le formulaire l'appelle via useActionState :
 * la demande est transmise à l'API (POST /tickets), qui est l'autorité de
 * validation (le client ne fait que pré-valider). Sur 201, redirection vers la
 * page de confirmation avec la référence émise par l'API ; sur 400, les codes
 * d'erreur par champ sont traduits avec les messages du site.
 * L'URL de confirmation ne porte que la référence, la date et les quantités,
 * jamais le nom ni l'email.
 */
const FIELD_MESSAGES = {
  date: () => site.tickets.errors.date,
  tickets: (code) =>
    code === "max" ? site.tickets.errors.max : site.tickets.errors.tickets,
  name: () => site.tickets.errors.name,
  email: () => site.tickets.errors.email,
};

export async function requestTickets(_previous, formData) {
  const { types } = await getTicketsConfig();
  const tickets = {};
  for (const type of types) {
    const quantity =
      Number.parseInt(String(formData.get(`qty-${type.id}`) ?? "0"), 10) || 0;
    if (quantity !== 0) tickets[type.id] = quantity;
  }

  let result;
  try {
    result = await postTickets({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      date: String(formData.get("date") ?? ""),
      tickets,
    });
  } catch {
    return { ok: false, errors: { generic: site.tickets.errors.generic } };
  }

  if (result.status === 400 && result.body.fields) {
    const errors = {};
    for (const [field, code] of Object.entries(result.body.fields)) {
      const message = FIELD_MESSAGES[field];
      if (message) errors[field] = message(code);
    }
    return { ok: false, errors };
  }
  if (result.status !== 201)
    return { ok: false, errors: { generic: site.tickets.errors.generic } };

  const { reference, date, tickets: lines } = result.body;
  const params = new URLSearchParams({ ref: reference, date });
  for (const line of lines) params.set(line.id, String(line.quantity));
  redirect(`/visit/confirmed?${params}`);
}
