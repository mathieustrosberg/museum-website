"use client";

import { useEffect, useRef } from "react";
import { reveal } from "@/lib/reveal";
import { transition } from "@/lib/transition";

/**
 * Racine d'une page (<main>) : lance les apparitions GSAP de ses descendants au
 * montage et les nettoie au démontage ou quand Next.js masque la route (Activity).
 * Pendant une transition entre pages, l'apparition attend que le voile commence
 * à se retirer (signal enter() de PageTransition).
 * `skipPreloader` marque la page (404, erreur) pour que le preloader ne joue pas.
 * Client Component sans état, dont les enfants restent des Server Components.
 */
export default function PageReveal({
  children,
  className,
  skipPreloader = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!transition.isPending()) return reveal(root);
    let cleanup = null;
    const off = transition.onEnter(() => {
      off();
      cleanup = reveal(root);
    });
    return () => {
      off();
      cleanup?.();
    };
  }, []);

  return (
    <main
      ref={ref}
      className={className}
      data-skip-preloader={skipPreloader ? "" : undefined}
    >
      {children}
    </main>
  );
}
