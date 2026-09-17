"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

/**
 * Formulaire de connexion ou de création de compte, dans la grammaire de la
 * billetterie : champs soulignés, pré-validation immédiate à la soumission
 * (mêmes règles que le serveur), champs en erreur marqués (couleur,
 * aria-invalid, message lié, focus sur le premier), envoi par Server Action
 * (useActionState), qui redirige une fois la session ouverte. `fields` liste
 * les champs dans l'ordre (name pour l'inscription) ; `hints` une indication
 * sous un champ, affichée tant qu'il n'est pas en erreur ; `next` la page à
 * rejoindre après connexion.
 */
const INITIAL = { ok: false, errors: {} };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTOCOMPLETE = { name: "name", email: "email" };
const TYPES = { name: "text", email: "email", password: "password" };

const fill = (template, n) => template.replace("{n}", String(n));

function focusFirstError(form, fields, errors) {
  const first = fields.find((key) => errors[key]);
  if (first) form?.elements.namedItem(first)?.focus();
}

function without(errors, key) {
  const { [key]: _removed, ...rest } = errors;
  return rest;
}

export default function AuthForm({
  action,
  fields,
  minPasswordLength,
  next,
  labels,
  hints = {},
  text,
  messages,
  ...attrs
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [localErrors, setLocalErrors] = useState(null);
  const [answered, setAnswered] = useState(state);
  const formRef = useRef(null);
  const id = useId();

  // Nouvelle réponse du serveur : elle remplace la pré-validation locale.
  if (answered !== state) {
    setAnswered(state);
    setLocalErrors(null);
  }

  const errors = localErrors ?? state.errors;
  const errorCount = Object.keys(errors).length;

  const clear = (key) =>
    setLocalErrors((local) => {
      const current = local ?? state.errors;
      return current[key] ? without(current, key) : local;
    });

  useEffect(() => {
    focusFirstError(formRef.current, fields, state.errors);
  }, [fields, state.errors]);

  const validate = (form) => {
    const found = {};
    if (fields.includes("name") && !form.name.value.trim())
      found.name = messages.name;
    if (!EMAIL.test(form.email.value.trim())) found.email = messages.email;
    const password = form.password.value;
    if (!password) found.password = messages.password;
    else if (fields.includes("name") && password.length < minPasswordLength)
      found.password = messages.passwordShort;
    return found;
  };

  // Pré-validation, puis envoi manuel : soumis par son attribut action, le
  // formulaire serait réinitialisé par React après un refus du serveur.
  const onSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const found = validate(form);
    if (Object.keys(found).length) {
      setLocalErrors(found);
      focusFirstError(form, fields, found);
      return;
    }
    setLocalErrors({});
    startTransition(() => formAction(new FormData(form)));
  };

  const errorId = (key) => `${id}-error-${key}`;
  const hintId = (key) => `${id}-hint-${key}`;
  const invalid = (key) => Boolean(errors[key]);
  const message = (key) =>
    errors[key] ? (
      <p id={errorId(key)} className="form__error label">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form
      ref={formRef}
      className="form account__form"
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
      {...attrs}
    >
      <p className="visually-hidden" role="alert">
        {errorCount
          ? errorCount === 1
            ? messages.summary.one
            : fill(messages.summary.other, errorCount)
          : ""}
      </p>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="form__fields">
        {fields.map((key) => (
          <div key={key} className="account__field">
            <label
              className={invalid(key) ? "field is-invalid" : "field"}
              htmlFor={`${id}-${key}`}
            >
              <span className="visually-hidden">{labels[key]}</span>
              <span className="field__box">
                <input
                  id={`${id}-${key}`}
                  type={TYPES[key]}
                  name={key}
                  placeholder={labels[key]}
                  autoComplete={
                    key === "password"
                      ? fields.includes("name")
                        ? "new-password"
                        : "current-password"
                      : AUTOCOMPLETE[key]
                  }
                  minLength={
                    key === "password" && fields.includes("name")
                      ? minPasswordLength
                      : undefined
                  }
                  required
                  aria-invalid={invalid(key)}
                  aria-describedby={
                    invalid(key)
                      ? errorId(key)
                      : hints[key]
                        ? hintId(key)
                        : undefined
                  }
                  onInput={() => clear(key)}
                />
              </span>
            </label>
            {message(key) ??
              (hints[key] ? (
                <p id={hintId(key)} className="form__hint is-muted">
                  {hints[key]}
                </p>
              ) : null)}
          </div>
        ))}
      </div>

      {message("generic")}
      <button className="link-underline" type="submit" disabled={pending}>
        {pending ? text.sending : text.submit}
      </button>
    </form>
  );
}
