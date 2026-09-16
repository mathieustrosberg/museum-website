"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { useEffect, useState } from "react";
import SiteImage from "@/components/SiteImage";
import { transition } from "@/lib/transition";

/**
 * Preloader au chargement complet d'une page : une pile de cartes se forme
 * (ressort), les cartes tombent une à une, puis le fond glisse vers le bas
 * pendant que la page arrive à l'échelle 1 et joue ses apparitions.
 * Les timings et les motifs de chute sont des constantes en tête de fichier.
 *
 * Rendu côté serveur (la page est couverte dès le premier octet), animé au
 * montage ; disparaît du DOM à la fin. Les navigations client ne le rejouent
 * pas : le layout racine n'est monté qu'une fois.
 */
const SCALE_DECREASE = 0.1; // écart d'échelle entre deux cartes de la pile
const Y_OFFSET = -7.5; // écart vertical entre deux cartes de la pile
const TOTAL_FALL_STAGGER = 0.75; // délai entre la première et la dernière chute
const DECK_MOVE_DURATION = 1; // avancée du reste de la pile
const ROTATION_PATTERN = [-10, 10, -15, 10, 20]; // rotation des cartes qui tombent
const X_PATTERN = [-5, 7.5, 10, 5, -10]; // décalage horizontal des cartes qui tombent

gsap.registerPlugin(CustomEase);

// La page qui se charge attend la fin du preloader pour ses apparitions.
if (typeof window !== "undefined") transition.setPending(true);

export default function Preloader({ brand, cards }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const container = document.querySelector("[data-preloader]");
    if (!container) return;

    // Pas d'animation de chargement en mouvement réduit ni sur les pages 404 et
    // erreur (marquées par PageReveal ; le CSS masque déjà le voile côté serveur).
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.querySelector("main[data-skip-preloader]")
    ) {
      transition.enter();
      setDone(true);
      return;
    }

    if (!CustomEase.get("cards"))
      CustomEase.create("cards", "M0,0 C0.625,0.05 0,1 1,1");

    const list = container.querySelector("[data-preloader-list]");
    const items = gsap.utils.toArray(
      container.querySelectorAll("[data-preloader-card]"),
    );
    const background = container.querySelector("[data-preloader-background]");
    const logo = container.querySelector("[data-preloader-logo]");
    const header = document.querySelector("main");

    const patternValue = (pattern, index) => pattern[index % pattern.length];
    const getStack = (index, total) => {
      const reverseIndex = total - 1 - index;
      return {
        scale: 1 - reverseIndex * SCALE_DECREASE,
        yPercent: reverseIndex * Y_OFFSET,
      };
    };
    const stackProp = (prop, total) => (index) => getStack(index, total)[prop];
    const getFallY = (card) => {
      const containerRect = container.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      return containerRect.bottom - cardRect.top + cardRect.height;
    };

    document.body.classList.add("is-loading", "is-transitioning");

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          document.body.classList.remove("is-loading", "is-transitioning");
          setDone(true);
        },
      });

      tl.fromTo(list, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.5);

      tl.fromTo(
        items,
        { rotate: 0.001, scale: 0.5, yPercent: 0 },
        {
          rotate: 0.001,
          scale: stackProp("scale", items.length),
          yPercent: stackProp("yPercent", items.length),
          stagger: -0.05,
          duration: 1.5,
          ease: "elastic.out(1,0.7)",
        },
        "<",
      );

      const fallCards = items.slice().reverse();
      const fallStagger = TOTAL_FALL_STAGGER / Math.max(items.length - 1, 1);
      const fallStart = tl.duration();

      fallCards.forEach((card, fallIndex) => {
        const remaining = items.slice(0, items.indexOf(card));
        const fallTime = fallStart + fallIndex * fallStagger;

        if (remaining.length) {
          tl.to(
            remaining,
            {
              scale: stackProp("scale", remaining.length),
              yPercent: stackProp("yPercent", remaining.length),
              duration: DECK_MOVE_DURATION,
              ease: "sine.inOut",
            },
            fallTime,
          );
        }

        tl.to(
          card,
          {
            y: () => getFallY(card),
            xPercent: patternValue(X_PATTERN, fallIndex),
            rotate: patternValue(ROTATION_PATTERN, fallIndex),
            duration: 0.8,
            ease: "power4.in",
          },
          fallTime,
        );
      });

      tl.to(
        background,
        {
          rotate: 0.001,
          yPercent: 100,
          duration: 1.5,
          ease: "cards",
          // Le fond glisse : la page peut commencer ses apparitions.
          onStart: () => transition.enter(),
        },
        "-=0.6",
      );

      // Le style inline n'est posé sur <main> qu'au départ du tween (pas au
      // montage) : la page, streamée, n'est pas encore hydratée à ce moment-là
      // et React signalerait un attribut inattendu. Invisible sous le fond.
      if (header) {
        tl.from(
          header,
          {
            rotate: 0.001,
            yPercent: -25,
            scale: 1.1,
            duration: 1.5,
            ease: "cards",
            immediateRender: false,
            clearProps: "transform",
          },
          "<",
        );
      }

      tl.to(
        logo,
        {
          rotate: 0.001,
          yPercent: 100,
          opacity: 0,
          duration: 0.8,
          ease: "power4.in",
        },
        "<-=1.5",
      );
    }, container);

    return () => {
      ctx.revert();
      document.body.classList.remove("is-loading", "is-transitioning");
    };
  }, []);

  if (done) return null;

  return (
    <div className="preloader" data-preloader>
      <div className="preloader__screen">
        <div className="preloader__background" data-preloader-background />
        <p className="preloader__logo" data-preloader-logo>
          {brand}
        </p>
        <div className="preloader__list" data-preloader-list>
          {cards.map((card) => (
            <div key={card.src} className="preloader__card" data-preloader-card>
              <SiteImage
                src={card.src}
                alt=""
                color={card.color}
                width={card.width}
                height={card.height}
                sizes="25vw"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
