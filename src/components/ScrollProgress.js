"use client";

import { useEffect, useState } from "react";

/**
 * Pourcentage de défilement de la page (0 → 100). Client Component : scroll,
 * redimensionnement et hauteur du document (ResizeObserver, pour les filtres).
 */
export default function ScrollProgress() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setValue(max > 0 ? Math.round((window.scrollY / max) * 100) : 0);
    };
    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);

  return (
    <p className="progress" aria-hidden="true">
      <span className="progress__value">{value}</span>%
    </p>
  );
}
