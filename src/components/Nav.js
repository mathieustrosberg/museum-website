"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Navigation fixe : marque | Espaces, Archives, À propos, Visite ............ horloge.
 * Client Component pour l'état du menu mobile [+] / [-] et le lien actif (usePathname). L'état est réinitialisé à chaque changement de route
 * grâce à la clé : le menu se referme après une navigation, comme à un chargement.
 */
export default function Nav(props) {
  const pathname = usePathname();
  return <NavBar key={pathname} pathname={pathname} {...props} />;
}

function NavBar({ brand, aria, links, clock, pathname }) {
  const [open, setOpen] = useState(false);
  const current = (href) => (pathname === href ? "page" : undefined);

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
              <Link
                key={link.href}
                className="nav__link"
                href={link.href}
                aria-current={current(link.href)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          {clock}
        </nav>
      </div>
    </header>
  );
}
