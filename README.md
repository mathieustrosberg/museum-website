# Halbton — museum-website

Site du musée fictif Halbton, centre for the printed image à Berlin : Next.js 16 (App Router), Server Components, Cache Components, GSAP. Les données viennent de l'API Halbton (projet `museum-api`), les photographies d'Unsplash.

## Commandes

```bash
npm run dev      # développement (Turbopack)
npm run build    # build de production, prérendu des 53 routes (l'API doit répondre)
npm run start    # serveur de production
npm run lint     # Biome (lint + format)
npm run format   # Biome, écriture
node tools/make-click.mjs   # régénère le son de clic
```

Stack : Next.js 16.3.5, React 19, JavaScript, Biome, React Compiler, Tailwind CSS v4, GSAP 3.15, dossier `src/`, alias `@/*`, npm.

## API

Le site lit les œuvres, l'archive, les expositions et les informations de visite sur l'API Halbton, et lui transmet les demandes de billets. L'URL de base vient de la variable d'environnement `HALBTON_API_URL` (fichier `.env.local` en local, réglages du projet sur Vercel) ; sans elle, le site vise `http://localhost:4000`, où tourne l'API en développement (`npm run dev` dans `museum-api`).

| Variable | Rôle |
|---|---|
| `HALBTON_API_URL` | URL de base de l'API (sans barre oblique finale) |
| `REVALIDATE_SECRET` | jeton attendu par `POST /api/revalidate?tag=…` pour invalider le cache après une mise à jour des données |

## Architecture

```
src/
  app/                  routes (App Router) : layout, page, work, work/[slug], archive, archive/[slug], about, visit, visit/confirmed, not-found, error
  app/api/revalidate    Route Handler d'invalidation du cache (revalidateTag)
  components/           partagés : Nav, Footer, Lines, Info, WorkCard, ArchiveTile, SiteImage, PageReveal, ScrollProgress, PageTransition, Preloader
  features/             par fonctionnalité : home/SelectedWorks, collection/CollectionBrowser, visit/Clock, tickets/TicketForm + actions (Server Action)
  lib/api.js            client de l'API : un scope "use cache" par lecture (cacheLife, cacheTag), POST des billets
  lib/content.js        vues sur les données pour les pages (sélection, médiums, œuvres proches, images dimensionnées) + textes du site
  lib/tickets.js        configuration de la billetterie et jours d'ouverture (depuis l'API)
  lib/reveal.js         moteur d'apparitions GSAP (navigateur)
  lib/noise-overlay.js  voile WebGL de la transition (quad plein écran + shader de bruit)
  lib/transition.js     état partagé de la transition (la page qui arrive attend le signal enter)
  data/site.json        textes, libellés, navigation, images des pages About et Visit
  styles/               globals.css (Tailwind sans Preflight + tokens) et le CSS du site
public/audio
tools/                  son de clic
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
| `error.js` | page d'erreur de route (contrat Next.js) : texte du site, bouton « Try again » |

Les données sont lues côté serveur (`lib/api.js` et `lib/content.js`, gardés par `server-only`) et transmises aux composants client sous forme sérialisable.

## Rendu

- **Cache Components / PPR** : activé (`cacheComponents: true`). Chaque lecture de l'API est une fonction `"use cache"` avec `cacheLife("hours")` et un `cacheTag` (`works`, `archive`, `exhibitions`, `visit`, `work:<slug>`…). Au build, les 53 routes sont prérendues avec ces données (les routes dynamiques listent leurs slugs avec `generateStaticParams`, lus sur l'API) ; le build affiche chaque route avec une revalidation d'une heure et une expiration d'un jour.
- **ISR** : après une heure, la première requête reçoit la version en cache et déclenche une revalidation en arrière-plan (stale-while-revalidate). Si l'API ne répond pas à ce moment, la version en cache reste servie. Un slug inconnu au build reçoit l'App Shell puis le rendu à la requête, mis en cache à son tour.
- **Invalidation** : `POST /api/revalidate?tag=works` (jeton `REVALIDATE_SECRET`) appelle `revalidateTag(tag, "max")` ; à brancher sur la mise à jour des données de l'API.
- **Requête** : la demande de billets est une Server Action (`requestTickets`) qui transmet la demande à l'API (`POST /tickets`), autorité de validation, puis redirige vers `/visit/confirmed` avec la référence émise par l'API. Les codes d'erreur par champ renvoyés par l'API sont traduits avec les messages du site.
- **PPR** : `/visit/confirmed` lit `searchParams` (référence, date, quantités), une donnée de requête. Le récapitulatif est un composant async derrière `<Suspense>` ; le reste de la page est le shell statique. C'est le seul trou dynamique du site, et il est justifié.

## Décisions de design et de rendu

- Le CSS du site (`src/styles`) est écrit à la main, avec ses tokens ; Tailwind est installé sans Preflight et exposé avec les tokens de la DA pour les ajouts.
- Les photographies sont servies par le CDN d'Unsplash, déjà recadrées par l'API (3:4 pour les feuilles, 3:4 ou 4:3 pour l'archive) ; `next/image` les redimensionne et les convertit (WebP, AVIF) à la demande selon `sizes` (`images.remotePatterns`). Les dimensions intrinsèques sont connues, donc aucun layout shift.
- Toutes les photographies passent par le même filtre, `--image-filter: grayscale(1)` (token de `tokens.css`) : le site reste noir, blanc et gris, comme tout ce qui passe par la trame. Mettre le token à `none` pour la couleur.
- Les textes apparaissent par masque de lignes (`Lines`, d'après « Masked Text Reveal » d'Osmo) : une ligne rendue côté serveur pour les textes courts, SplitText pour les paragraphes multilignes. Le texte reste du texte, lisible par les lecteurs d'écran.
- La classe `is-revealed` est posée sur `<main>` et non sur `<html>` : en navigation client, chaque page arrive masquée et rejoue son apparition.
- La page Visit vit à `/visit` ; `/contact` et `/tickets` y redirigent.

## Transition entre pages

Au clic sur un lien interne : son, puis un voile plein écran, du gris de la barre de navigation, se forme par dissolution de bruit (1 s, `power1.in`), la route est poussée dans le router derrière le voile, puis le voile se dissout (1 s) pendant que la page joue ses apparitions. Le shader est celui de la transition « about » de la démo Codrops « Page Transitions with Astro, Barba.js and GSAP » (d'après faint-film.com), porté en WebGL natif sans Three.js ni Barba : Next.js assure la navigation et `PageReveal` attend le signal d'entrée. La couleur du voile est le token `--color-transition`. Sans WebGL ou avec `prefers-reduced-motion`, la navigation est simplement différée de 120 ms.

## Preloader

Au chargement complet d'une page, `Preloader` (client, rendu côté serveur pour couvrir la page dès le premier octet) joue la « Dropping Cards Loading Animation » d'Osmo avec ses timings d'origine : cinq feuilles de la collection s'empilent (ressort), tombent une à une, puis le fond gris glisse vers le bas pendant que `<main>` arrive à l'échelle 1 et que la page joue ses apparitions (signal `enter()` de `lib/transition.js`, le même que pour la transition entre pages). Le composant se retire du DOM à la fin ; les navigations client ne le rejouent pas. `prefers-reduced-motion` le saute.

## Fonctionnalités

- Collection, œuvres, archive et expositions lues sur l'API Halbton, mises en cache et revalidées (Cache Components).
- Apparition des textes par masque de lignes, discrète (0,8 s, expo.out, 0,08 s entre lignes et entre éléments d'une liste).
- Transition entre pages (voile de bruit WebGL).
- Preloader (pile de cartes qui tombent).
- Billetterie sur la page Visit (`/visit`) : jour d'ouverture (liste fournie par l'API), billets plein / réduit / moins de 18 ans, total en direct, validation immédiate avec erreurs en couleur (seule couleur du site, `--color-error`), demande transmise à l'API par Server Action, page de confirmation `/visit/confirmed` avec référence et récapitulatif, paiement sur place. `/contact` et `/tickets` redirigent vers `/visit`.
- Recherche dans la Collection (titre, artiste, médium, année), instantanée, insensible à la casse et aux accents, combinée aux filtres.
- Favicon monochrome, page 404, page d'erreur, métadonnées (title template, description, Open Graph), labels de formulaire associés, texte des apparitions lisible par les lecteurs d'écran.
