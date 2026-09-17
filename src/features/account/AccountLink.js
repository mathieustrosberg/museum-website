import { NavLink } from "@/components/Nav";
import { getSession } from "@/lib/auth";
import { site } from "@/lib/content";

/**
 * Lien de compte de la navigation (Server Component, derrière <Suspense> dans
 * le layout : lit la session). Sans session, « Connexion » vers /login ;
 * connecté, le prénom vers /account.
 */
export default async function AccountLink() {
  const session = await getSession();
  const { nav } = site.account;
  if (!session) return <NavLink href="/login">{nav.signedOut}</NavLink>;
  const name = session.user.name.trim();
  return (
    <NavLink
      href="/account"
      className="nav__account"
      aria-label={nav.aria.replace("{name}", name || nav.signedIn)}
    >
      {name.split(/\s+/)[0] || nav.signedIn}
    </NavLink>
  );
}
