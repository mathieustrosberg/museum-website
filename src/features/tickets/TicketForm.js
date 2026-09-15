"use client";

import {
  useActionState,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { requestTickets } from "@/features/tickets/actions";

/**
 * Formulaire de billets. Client Component : quantités et total en direct,
 * pré-validation immédiate à la soumission (mêmes règles que le serveur), champs
 * en erreur marqués (couleur, aria-invalid, message lié, focus sur le premier),
 * envoi par la Server Action requestTickets (useActionState), qui redirige vers
 * la page de confirmation. Le formulaire se remet à zéro quand on quitte la page.
 */
const INITIAL = { ok: false, errors: {} };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER = ["name", "email", "date", "tickets"];

const money = (currency, amount) => `${currency}${amount}`;
const fill = (template, n) => template.replace("{n}", String(n));

export default function TicketForm({
  days,
  types,
  currency,
  maxPerType,
  labels,
  messages,
}) {
  const [state, formAction, pending] = useActionState(requestTickets, INITIAL);
  const [localErrors, setLocalErrors] = useState(null);
  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries(types.map((t) => [t.id, 0])),
  );
  const formRef = useRef(null);
  const id = useId();

  const errors = localErrors ?? state.errors;
  const errorCount = Object.keys(errors).length;
  const total = types.reduce((sum, t) => sum + quantities[t.id] * t.price, 0);
  const count = Object.values(quantities).reduce((a, b) => a + b, 0);

  const setQuantity = (typeId, value) => {
    setQuantities((q) => ({
      ...q,
      [typeId]: Math.min(maxPerType, Math.max(0, value)),
    }));
    setLocalErrors((e) => (e?.tickets ? { ...e, tickets: undefined } : e));
  };

  // Focus sur le premier champ en erreur après une soumission refusée.
  useEffect(() => {
    if (!errorCount) return;
    const first = ORDER.find((key) => errors[key]);
    formRef.current?.querySelector(`[data-error-for="${first}"]`)?.focus();
  }, [errors, errorCount]);

  // Page quittée (route masquée par Next) : nouvelle visite = formulaire neuf.
  useLayoutEffect(() => {
    return () => {
      formRef.current?.reset();
      setQuantities(Object.fromEntries(types.map((t) => [t.id, 0])));
      setLocalErrors(null);
    };
  }, [types]);

  const validate = (form) => {
    const found = {};
    if (!form.date.value) found.date = messages.date;
    if (count === 0) found.tickets = messages.tickets;
    if (!form.name.value.trim()) found.name = messages.name;
    if (!EMAIL.test(form.email.value.trim())) found.email = messages.email;
    return found;
  };

  const onSubmit = (event) => {
    const found = validate(event.currentTarget);
    if (Object.keys(found).length) {
      event.preventDefault();
      setLocalErrors(found);
      return;
    }
    setLocalErrors(null);
  };

  const clear = (key) =>
    setLocalErrors((e) => (e?.[key] ? { ...e, [key]: undefined } : e));
  const errorId = (key) => `${id}-error-${key}`;
  const invalid = (key) => Boolean(errors[key]);
  const message = (key) =>
    errors[key] ? (
      <p id={errorId(key)} className="tickets__error label">
        {errors[key]}
      </p>
    ) : null;
  const fieldClass = (key) => (invalid(key) ? "field is-invalid" : "field");

  return (
    <form
      ref={formRef}
      className="form tickets__form"
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
      data-reveal="fade-up"
      data-y="24"
      data-delay="0.3"
    >
      <p className="visually-hidden" role="alert">
        {errorCount
          ? errorCount === 1
            ? messages.summary.one
            : fill(messages.summary.other, errorCount)
          : ""}
      </p>

      <div className="form__fields">
        <div className="tickets__group">
          <label className={fieldClass("name")} htmlFor={`${id}-name`}>
            <span className="visually-hidden">{labels.name}</span>
            <span className="field__box">
              <input
                id={`${id}-name`}
                type="text"
                name="name"
                placeholder={labels.name}
                autoComplete="name"
                required
                aria-invalid={invalid("name")}
                aria-describedby={invalid("name") ? errorId("name") : undefined}
                data-error-for="name"
                onInput={() => clear("name")}
              />
            </span>
          </label>
          {message("name")}
          <label className={fieldClass("email")} htmlFor={`${id}-email`}>
            <span className="visually-hidden">{labels.email}</span>
            <span className="field__box">
              <input
                id={`${id}-email`}
                type="email"
                name="email"
                placeholder={labels.email}
                autoComplete="email"
                required
                aria-invalid={invalid("email")}
                aria-describedby={
                  invalid("email") ? errorId("email") : undefined
                }
                data-error-for="email"
                onInput={() => clear("email")}
              />
            </span>
          </label>
          {message("email")}
        </div>

        <div className="tickets__group">
          <label className="label" htmlFor={`${id}-date`}>
            {labels.date}
          </label>
          <span className={fieldClass("date")}>
            <span className="field__box">
              <select
                id={`${id}-date`}
                name="date"
                defaultValue=""
                required
                aria-invalid={invalid("date")}
                aria-describedby={invalid("date") ? errorId("date") : undefined}
                data-error-for="date"
                onChange={() => clear("date")}
              >
                <option value="" disabled>
                  {labels.datePlaceholder}
                </option>
                {days.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </span>
          </span>
          {message("date")}
        </div>

        <fieldset
          className={
            invalid("tickets") ? "tickets__group is-invalid" : "tickets__group"
          }
          aria-describedby={invalid("tickets") ? errorId("tickets") : undefined}
        >
          <legend className="label">{labels.tickets}</legend>
          {types.map((type, i) => (
            <div key={type.id} className="tickets__row">
              <label className="tickets__type" htmlFor={`${id}-${type.id}`}>
                <span>{type.label}</span>
                <span className="is-muted">
                  {type.price ? money(currency, type.price) : labels.free}
                </span>
              </label>
              <span className="stepper">
                <button
                  type="button"
                  aria-label={`${labels.decrease}, ${type.label}`}
                  disabled={quantities[type.id] === 0}
                  onClick={() => setQuantity(type.id, quantities[type.id] - 1)}
                >
                  [-]
                </button>
                <input
                  id={`${id}-${type.id}`}
                  name={`qty-${type.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={maxPerType}
                  value={quantities[type.id]}
                  data-error-for={i === 0 ? "tickets" : undefined}
                  onChange={(e) =>
                    setQuantity(
                      type.id,
                      Number.parseInt(e.target.value, 10) || 0,
                    )
                  }
                />
                <button
                  type="button"
                  aria-label={`${labels.increase}, ${type.label}`}
                  disabled={quantities[type.id] >= maxPerType}
                  onClick={() => setQuantity(type.id, quantities[type.id] + 1)}
                >
                  [+]
                </button>
              </span>
            </div>
          ))}
          <div className="tickets__row tickets__total">
            <span className="label">{labels.total}</span>
            <output aria-live="polite">{money(currency, total)}</output>
          </div>
          {message("tickets")}
        </fieldset>
      </div>

      {message("generic")}
      <button className="link-underline" type="submit" disabled={pending}>
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
