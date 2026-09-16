"use client";

import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { COVERED, createNoiseOverlay, HIDDEN } from "@/lib/noise-overlay";
import { transition } from "@/lib/transition";

/**
 * Navigation interne : transition entre pages.
 *
 * 1. leave : le voile de bruit couvre la page (uProgress 1.5 → -0.75, 1 s).
 * 2. la nouvelle route est poussée dans le router (le scroll repart en haut,
 *    caché par le voile) ; la page qui arrive attend le signal enter().
 * 3. enter : le voile se dissout (uProgress → 1.5, 1 s) ; à mi-dissolution la
 *    page reçoit le signal et joue ses apparitions, sans chevauchement.
 *
 * L'écouteur est posé en phase de capture : il précède le gestionnaire de
 * <Link>, qui respecte preventDefault. Un lien vers la page courante ne
 * navigue pas. Sans WebGL ou avec prefers-reduced-motion, la navigation est
 * immédiate, sans voile.
 */
const DURATION = 1;
const EASE = "power1.in";
const SAFETY = 4000;
// Point de la dissolution (uProgress) où la page qui arrive lance ses apparitions :
// le voile ne se dégage qu'à partir de 0 et a disparu vers 1.2 ; à 0.5 il ne
// reste que des îlots, les textes montent juste après qu'il s'est retiré.
const ENTER_AT = 0.5;

/** URL relative d'une navigation interne « simple », sinon null. */
function internalUrl(link, event) {
  if (event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return null;
  if (link.target && link.target !== "_self") return null;
  if (link.hasAttribute("download")) return null;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return null;
  if (url.pathname === location.pathname && url.hash) return null;
  return url.pathname + url.search + url.hash;
}

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const enterRef = useRef(null);
  const lastPathRef = useRef(pathname);

  // Voile WebGL, créé une fois.
  useEffect(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue(
      "--color-transition",
    );
    const overlay = createNoiseOverlay(canvasRef.current, color || "#000");
    overlayRef.current = overlay;
    if (!overlay) return;
    const onResize = () => {
      overlay.resize();
      overlay.draw();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      overlay.dispose();
      overlayRef.current = null;
    };
  }, []);

  // Clics : transition, puis navigation.
  useEffect(() => {
    const canvas = canvasRef.current;

    const release = () => {
      canvas.classList.remove("is-active");
      document.body.classList.remove("is-transitioning");
      transition.setPending(false);
    };

    const leave = (url) => {
      const overlay = overlayRef.current;
      document.body.classList.add("is-transitioning");
      canvas.classList.add("is-active");
      gsap.to(overlay, {
        progress: COVERED,
        duration: DURATION,
        ease: EASE,
        onUpdate: () => overlay.draw(),
        onComplete: () => {
          transition.setPending(true);
          // Si la route n'arrive pas, on libère la page.
          enterRef.current = setTimeout(release, SAFETY);
          router.push(url);
        },
      });
    };

    const onClick = (event) => {
      const link = event
        .composedPath()
        .find((node) => node instanceof Element && node.matches("a[href]"));
      if (!link) return;

      const url = internalUrl(link, event);
      if (!url) return;
      event.preventDefault();

      if (url === location.pathname + location.search) return;
      if (document.body.classList.contains("is-transitioning")) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced || !overlayRef.current) {
        router.push(url);
        return;
      }
      leave(url);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  // La nouvelle route est rendue : le voile se retire, la page apparaît.
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    if (!transition.isPending()) return;
    clearTimeout(enterRef.current);
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    let entered = false;
    const tween = gsap.to(overlay, {
      progress: HIDDEN,
      duration: DURATION,
      ease: EASE,
      onUpdate: () => {
        overlay.draw();
        if (!entered && overlay.progress >= ENTER_AT) {
          entered = true;
          transition.enter();
        }
      },
      onComplete: () => {
        if (!entered) transition.enter();
        canvas.classList.remove("is-active");
        document.body.classList.remove("is-transitioning");
      },
    });
    return () => tween.kill();
  }, [pathname]);

  return <canvas ref={canvasRef} className="transition" />;
}
