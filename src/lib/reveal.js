/**
 * Apparitions déclaratives d'une page, pilotées par attributs :
 *
 *   data-reveal="lines"    : masque de lignes, chaque ligne glisse depuis 110 %
 *                            (0.8 s, expo.out, 0.08 s entre les lignes) ; les éléments
 *                            frères d'un même parent se suivent du même pas
 *   data-split="lines"     : texte multiligne découpé par SplitText (fontes chargées)
 *   data-reveal="fade-up"  : opacité + translation (data-y, défaut 20px)
 *   data-reveal="scale"    : opacité + échelle (data-scale, défaut 0.9)
 *   data-reveal-each="…"   : applique l'effet à chaque enfant direct
 *
 * Options : data-delay, data-duration, data-stagger, variantes -tablet / -mobile.
 *
 * Module navigateur : importé uniquement par des Client Components. reveal(root)
 * rend une fonction de nettoyage (gsap.context().revert(), SplitText.revert()).
 */
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

const EASE = "power3.out";
const DEFAULTS = {
  lines: { duration: 0.8, delay: 0.3, stagger: 0.08, ease: "expo.out" },
  "fade-up": { duration: 0.8, delay: 0, y: 20 },
  scale: { duration: 0.8, delay: 0, scale: 0.9 },
};

/** Breakpoints alignés sur la référence : mobile < 768, tablet 768–1159, desktop ≥ 1160 */
export const BP = { tablet: 768, desktop: 1160 };

export function currentBreakpoint() {
  if (window.matchMedia(`(min-width: ${BP.desktop}px)`).matches)
    return "desktop";
  if (window.matchMedia(`(min-width: ${BP.tablet}px)`).matches) return "tablet";
  return "mobile";
}

/**
 * Lit une option numérique avec sa variante de breakpoint.
 * data-delay="0.5" data-delay-tablet="1" data-delay-mobile="1.2"
 */
function option(el, name, fallback, bp) {
  const specific = el.dataset[`${name}${bp[0].toUpperCase()}${bp.slice(1)}`];
  const base = el.dataset[name];
  const value = bp !== "desktop" && specific !== undefined ? specific : base;
  return value !== undefined ? Number.parseFloat(value) : fallback;
}

/** Rang de l'élément parmi les frères révélés par lignes du même parent (cascade). */
function siblingIndex(el) {
  const siblings = [...el.parentElement.children].filter(
    (c) => c.dataset.reveal === "lines",
  );
  return Math.max(0, siblings.indexOf(el));
}

function linesTween(targets, el, bp, extraDelay) {
  const d = DEFAULTS.lines;
  return gsap.from(targets, {
    yPercent: 110,
    duration: option(el, "duration", d.duration, bp),
    delay: option(el, "delay", d.delay, bp) + extraDelay,
    stagger: option(el, "stagger", d.stagger, bp),
    ease: d.ease,
  });
}

function animateLines(el, bp, splits) {
  const extraDelay = siblingIndex(el) * DEFAULTS.lines.stagger;
  gsap.set(el, { autoAlpha: 1 });

  if (el.dataset.split === "lines") {
    let first = true;
    const split = SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "line",
      autoSplit: true,
      onSplit(self) {
        if (!first) return gsap.set(self.lines, { yPercent: 0 });
        first = false;
        return linesTween(self.lines, el, bp, extraDelay);
      },
    });
    splits.push(split);
    return;
  }

  linesTween(el.querySelectorAll(".line"), el, bp, extraDelay);
}

function animateFadeUp(targets, el, bp) {
  const d = DEFAULTS["fade-up"];
  gsap.fromTo(
    targets,
    { autoAlpha: 0, y: option(el, "y", d.y, bp) },
    {
      autoAlpha: 1,
      y: 0,
      duration: option(el, "duration", d.duration, bp),
      delay: option(el, "delay", d.delay, bp),
      stagger: option(el, "stagger", 0, bp),
      ease: EASE,
      clearProps: "transform",
    },
  );
}

function animateScale(targets, el, bp) {
  const d = DEFAULTS.scale;
  gsap.fromTo(
    targets,
    { autoAlpha: 0, scale: option(el, "scale", d.scale, bp) },
    {
      autoAlpha: 1,
      scale: 1,
      duration: option(el, "duration", d.duration, bp),
      delay: option(el, "delay", d.delay, bp),
      stagger: option(el, "stagger", 0, bp),
      ease: EASE,
      clearProps: "transform",
    },
  );
}

function run(type, targets, el, bp, splits) {
  if (type === "lines") animateLines(el, bp, splits);
  else if (type === "fade-up") animateFadeUp(targets, el, bp);
  else if (type === "scale") animateScale(targets, el, bp);
}

/**
 * Lance toutes les apparitions d'une racine de page, après le chargement des
 * fontes (aucun décalage de découpe). Rend la fonction de nettoyage.
 */
export function reveal(root) {
  if (!root) return () => {};

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("is-revealed");
    return () => root.classList.remove("is-revealed");
  }

  const ctx = gsap.context(() => {}, root);
  const splits = [];
  let cancelled = false;

  document.fonts.ready.then(() => {
    if (cancelled) return;
    const bp = currentBreakpoint();
    ctx.add(() => {
      for (const el of root.querySelectorAll("[data-reveal]"))
        run(el.dataset.reveal, el, el, bp, splits);
      for (const el of root.querySelectorAll("[data-reveal-each]")) {
        run(el.dataset.revealEach, [...el.children], el, bp, splits);
      }
    });
    root.classList.add("is-revealed");
  });

  return () => {
    cancelled = true;
    for (const split of splits) split.revert();
    ctx.revert();
    root.classList.remove("is-revealed");
  };
}
