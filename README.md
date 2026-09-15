# Halbton — museum-website

Site du musée fictif Halbton, centre for the printed image à Berlin : Next.js 16 (App Router), Server Components, Cache Components, GSAP.

## Commandes

```bash
npm run dev      # développement (Turbopack)
npm run build    # build de production, prérendu des 53 routes
npm run start    # serveur de production
npm run lint     # Biome (lint + format)
npm run format   # Biome, écriture
node tools/make-placeholders.mjs && node tools/image-sizes.mjs   # régénère les images tramées et leurs dimensions
node tools/similar-works.mjs                                     # recalcule les œuvres similaires
```

Stack : Next.js 16.3.5, React 19, JavaScript, Biome, React Compiler, Tailwind CSS v4, GSAP 3.12, dossier `src/`, alias `@/*`, npm.

## Architecture

```
src/
  app/                  routes (App Router) : layout, page, work, work/[slug], archive, archive/[slug], about, visit, not-found
  components/           partagés : Nav, Footer, Lines, Info, WorkCard, ArchiveTile, SiteImage, PageReveal, ScrollProgress, PageTransition, Preloader
  features/             par fonctionnalité : home/SelectedWorks, collection/CollectionBrowser, visit/Clock, tickets/TicketForm + actions (Server Action)
  lib/content.js        accès aux données (serveur uniquement)
  lib/tickets.js        jours d'ouverture à venir ("use cache", cacheLife("hours"))
  lib/reveal.js         moteur d'apparitions GSAP (navigateur)
  lib/noise-overlay.js  voile WebGL de la transition (quad plein écran + shader de bruit)
  lib/transition.js     état partagé de la transition (la page qui arrive attend le signal enter)
  data/*.json           données statiques : site, artists, projects, exhibitions, archive, images (dimensions)
  styles/               globals.css (Tailwind sans Preflight + tokens) et le CSS du site, inchangé
public/images, public/audio
tools/                  génération des placeholders, dimensions d'images, œuvres similaires, son de clic
```

## Server / Client Components

Tout est Server Component par défaut : layout, pages, cartes, cartel, blocs de texte, footer. Les Client Components (`"use client"`) sont petits et bas dans l'arbre, chacun pour un besoin navigateur précis :

| Composant | Raison |
|---|---|
| `PageReveal` | GSAP, `document.fonts.ready`, `matchMedia` ; `gsap.context().revert()` au nettoyage |
| `Nav` | état du menu mobile, lien actif (`usePathname`), réinitialisé par clé à chaque route ; reçoit l'horloge en prop |
| `PageTransition` | son de clic, voile WebGL de transition (bruit de dissolution), navigation via le router |
| `Preloader` | animation de chargement GSAP (pile de cartes), une fois par chargement complet |
| `SelectedWorks` | survol d'une ligne → aperçu dans le panneau image (état partagé) |
| `CollectionBrowser` | filtres, recherche, comptes, cartes masquées (`hidden`) |
| `ScrollProgress` | scroll, resize, ResizeObserver |
| `Clock` | `setInterval`, fuseau de Berlin, rendu « 00:00 » côté serveur, affichée dans la navigation |
| `TicketForm` | quantités et total en direct, pré-validation, erreurs marquées et focalisées, envoi par Server Action (`useActionState`) |

Les données sont lues côté serveur (`lib/content.js`, gardé par `server-only`) et transmises aux composants client sous forme sérialisable.

## Rendu

- **SSG** : les 53 routes sont prérendues au build. Les données sont des JSON importés au chargement du module : des « valeurs prévisibles » pour Next.js, donc un shell statique complet sans directive de cache. Les routes dynamiques (`work/[slug]`, `archive/[slug]`) listent leurs paramètres avec `generateStaticParams`.
- **Cache Components / PPR** : activé (`cacheComponents: true`). Le Partial Prerendering est le comportement par défaut : chaque route a un shell statique ; un slug inconnu reçoit l'App Shell puis le rendu à la requête (ISR avec Cache Components), qui aboutit à la 404.
- **ISR / cache** : la billetterie. La liste des jours d'ouverture dépend de la date du jour : `getOpenDays()` et le bloc `Booking` de `/visit` sont des scopes `"use cache"` avec `cacheLife("hours")`. Le build affiche la route avec une revalidation d'une heure et une expiration d'un jour : le contenu est prérendu puis rafraîchi seul.
- **Requête** : la demande de billets est une Server Action (`requestTickets`) : validation côté serveur, référence de retrait, redirection vers `/visit/confirmed`. Aucune persistance : c'est le point d'entrée de la future API.
- **PPR** : `/visit/confirmed` lit `searchParams` (référence, date, quantités), une donnée de requête. Le récapitulatif est un composant async derrière `<Suspense>` ; le reste de la page est le shell statique. C'est le seul trou dynamique du site, et il est justifié.

Points d'insertion prévus pour l'API : voir AGENTS.md.

## Décisions de design et de rendu

- Le CSS du site (`src/styles`) est écrit à la main, avec ses tokens ; Tailwind est installé sans Preflight et exposé avec les tokens de la DA pour les ajouts.
- `next/image` est utilisé avec `unoptimized` : les placeholders sont des PNG tramés 1 bit qu'un ré-encodage flouterait. Retirer le drapeau quand de vraies photographies arrivent.
- Les textes apparaissent par masque de lignes (`Lines`, d'après « Masked Text Reveal » d'Osmo) : une ligne rendue côté serveur pour les textes courts, SplitText pour les paragraphes multilignes. Le texte reste du texte, lisible par les lecteurs d'écran.
- La classe `is-revealed` est posée sur `<main>` et non sur `<html>` : en navigation client, chaque page arrive masquée et rejoue son apparition.
- La page Visit vit à `/visit` ; `/contact` et `/tickets` y redirigent.

## Transition entre pages

Au clic sur un lien interne : son, puis un voile plein écran, du gris de la barre de navigation, se forme par dissolution de bruit (1 s, `power1.in`), la route est poussée dans le router derrière le voile, puis le voile se dissout (1 s) pendant que la page joue ses apparitions. Le shader est celui de la transition « about » de la démo Codrops « Page Transitions with Astro, Barba.js and GSAP » (d'après faint-film.com), porté en WebGL natif sans Three.js ni Barba : Next.js assure la navigation et `PageReveal` attend le signal d'entrée. La couleur du voile est le token `--color-transition`. Sans WebGL ou avec `prefers-reduced-motion`, la navigation est simplement différée de 120 ms.

## Preloader

Au chargement complet d'une page, `Preloader` (client, rendu côté serveur pour couvrir la page dès le premier octet) joue la « Dropping Cards Loading Animation » d'Osmo avec ses timings d'origine : cinq feuilles de la collection s'empilent (ressort), tombent une à une, puis le fond gris glisse vers le bas pendant que `<main>` arrive à l'échelle 1 et que la page joue ses apparitions (signal `enter()` de `lib/transition.js`, le même que pour la transition entre pages). Le composant se retire du DOM à la fin ; les navigations client ne le rejouent pas. `prefers-reduced-motion` le saute.

## Fonctionnalités

- Apparition des textes par masque de lignes, discrète (0,8 s, expo.out, 0,08 s entre lignes et entre éléments d'une liste).
- Transition entre pages (voile de bruit WebGL).
- Preloader (pile de cartes qui tombent).
- Billetterie sur la page Visit (`/visit`) : jour d'ouverture, billets plein / réduit / moins de 18 ans, total en direct, validation immédiate avec erreurs en couleur (seule couleur du site, `--color-error`), demande par Server Action, page de confirmation `/visit/confirmed` avec référence et récapitulatif, paiement sur place. `/contact` et `/tickets` redirigent vers `/visit`.
- Recherche dans la Collection (titre, artiste, médium, année), instantanée, insensible à la casse et aux accents, combinée aux filtres.
- Favicon monochrome, page 404, métadonnées (title template, description, Open Graph), labels de formulaire associés, texte des apparitions lisible par les lecteurs d'écran.
