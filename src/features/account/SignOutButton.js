"use client";

import { useActionState } from "react";
import { signOut } from "@/features/account/actions";

/** Déconnexion : un bouton souligné qui soumet la Server Action signOut (redirige vers l'accueil). */
export default function SignOutButton({ label, pendingLabel, ...attrs }) {
  const [, action, pending] = useActionState(signOut, null);
  return (
    <form action={action} {...attrs}>
      <button className="link-underline" type="submit" disabled={pending}>
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
