"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

/**
 * Horloge locale de Lanzarote, mise à jour à chaque minute. Rendue « 00:00 » par le
 * serveur puis remplie côté client : aucun écart d'hydratation, l'heure dépend
 * du navigateur. À chaque changement les chiffres glissent de 12px (GSAP).
 * Affichée dans le pied de page : [22:38] Heure locale.
 */
export default function Clock({ label, aria, timeZone, className }) {
  const [time, setTime] = useState("00:00");
  const digitsRef = useRef(null);

  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
    let last = null;
    let tween = null;
    const render = (animate) => {
      const next = format.format(new Date());
      if (next === last) return;
      last = next;
      if (!animate) {
        setTime(next);
        return;
      }
      // Depuis la minuterie (hors rendu React) : le DOM est mis à jour avant l'animation.
      flushSync(() => setTime(next));
      if (digitsRef.current) {
        tween?.kill();
        tween = gsap.fromTo(
          digitsRef.current,
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
        );
      }
    };
    render(false);
    // Se cale sur la prochaine minute pleine, puis toutes les 60 s.
    let interval;
    const timeout = setTimeout(
      () => {
        render(true);
        interval = setInterval(() => render(true), 60000);
      },
      60000 - (Date.now() % 60000),
    );
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      tween?.kill();
    };
  }, [timeZone]);

  return (
    <div className={className}>
      <p className="clock" role="timer" aria-label={aria}>
        [
        <span ref={digitsRef} className="clock__digits">
          {time}
        </span>
        ]
      </p>
      <p className="is-muted">{label}</p>
    </div>
  );
}
