"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Navigation fixe : marque | Collection, Archives, À propos, Visite ............ Connexion (ou le prénom).
 * Client Component pour l'état du menu mobile [+] / [-] et le lien actif (usePathname). L'état est réinitialisé à chaque changement de route
 * grâce à la clé : le menu se referme après une navigation, comme à un chargement.
 * `account` est le lien de compte, rendu côté serveur selon la session
 * (AccountLink) et reçu en prop ; il occupe le bord droit de la barre.
 */
export default function Nav(props) {
  const pathname = usePathname();
  return <NavBar key={pathname} {...props} />;
}

/** Lien de la navigation, marqué courant quand il mène à la page affichée. */
export function NavLink({ href, className, children, ...props }) {
  const pathname = usePathname();
  return (
    <Link
      className={className ? `nav__link ${className}` : "nav__link"}
      href={href}
      aria-current={pathname === href ? "page" : undefined}
      {...props}
    >
      {children}
    </Link>
  );
}

function NavBar({ brand, aria, links, account }) {
  const [open, setOpen] = useState(false);

  return (
    <header className={open ? "nav is-open" : "nav"} id="nav">
      <div className="nav__inner">
        <div className="nav__bar">
          <Link className="nav__brand nav__link" href="/">
            {brand}
          </Link>
          <button
            className="nav__toggle"
            type="button"
            aria-expanded={open}
            aria-controls="nav-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="is-closed-label">[+]</span>
            <span className="is-open-label">[-]</span>
          </button>
        </div>
        <nav className="nav__menu" id="nav-menu" aria-label={aria}>
          <div className="nav__links">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </div>
          {account}
        </nav>
      </div>
    </header>
  );
}
