# Fondation César Manrique — museum-website

Site de la Fondation César Manrique (Tahíche, Lanzarote), projet d'étude : Next.js 16 (App Router), Server Components, Cache Components, GSAP. Les données et les photographies viennent de l'API de la Fondation (projet `museum-api`).

## Commandes

```bash
npm run dev      # développement (Turbopack)
npm run build    # build de production, prérendu de toutes les routes (l'API doit répondre)
npm run start    # serveur de production
npm run lint     # Biome (lint + format)
npm run format   # Biome, écriture
```

Stack : Next.js 16.3.5, React 19, JavaScript, Biome, React Compiler, Tailwind CSS v4, GSAP 3.15, dossier `src/`, alias `@/*`, npm.

## API et environnement

Le site lit la collection, l'archive et les informations de visite sur l'API de la Fondation (museum-api), et lui transmet les demandes de billets. L'URL de base vient de la variable d'environnement `FCM_API_URL` (fichier `.env.local` en local, réglages du projet sur Vercel) ; sans elle, le site vise `http://localhost:4000`, où tourne l'API en développement (`npm run dev` dans `museum-api`).

| Variable | Rôle |
|---|---|
| `FCM_API_URL` | URL de base de l'API (sans barre oblique finale) |
| `SITE_URL` | adresse publique du site (`https://…`, sans barre oblique finale), base des URL absolues des métadonnées, du sitemap et de robots.txt ; sur Vercel, l'adresse de production du déploiement est utilisée par défaut |
| `REVALIDATE_SECRET` | jeton attendu par `POST /api/revalidate?tag=…` pour invalider le cache après une mise à jour des données |

## Architecture

```
src/
  app/                  routes (App Router) : layout, page, work, work/[slug], archive, archive/[slug], about, visit, visit/confirmed, not-found, error
  app/api/revalidate    Route Handler d'invalidation du cache (revalidateTag)
  app/sitemap.js        sitemap.xml (pages fixes, fiches, entrées d'archive) ; app/robots.js : robots.txt
  app/opengraph-image.jpg  image de partage par défaut (fenêtre du salon), avec son texte alternatif
  components/           partagés : Nav, Footer, Lines, Info, WorkCard, ArchiveTile, SiteImage, PageReveal, ScrollProgress, PageTransition, Preloader
  features/             par fonctionnalité : home/SelectedWorks, collection/CollectionBrowser, visit/Clock, tickets/TicketForm + actions (Server Action)
  lib/api.js            client de l'API : un scope "use cache" par lecture (cacheLife, cacheTag), POST des billets
  lib/content.js        vues sur les données pour les pages (sélection, types, lieux, fiches proches, images dimensionnées) + textes du site
  lib/tickets.js        configuration de la billetterie et jours d'ouverture (depuis l'API)
  lib/metadata.js       adresse publique du site, Open Graph commun, image de partage d'une fiche
  lib/reveal.js         moteur d'apparitions GSAP (navigateur)
  lib/noise-overlay.js  voile WebGL de la transition (quad plein écran + shader de bruit)
  lib/transition.js     état partagé de la transition (la page qui arrive attend le signal enter)
  data/site.json        textes, libellés, navigation, images des pages d'accueil, À propos et Visite
  styles/               globals.css (Tailwind sans Preflight + tokens) et le CSS du site
```

## Server / Client Components

Tout est Server Component par défaut : layout, pages, cartes, cartel, blocs de texte, footer. Les Client Components (`"use client"`) sont petits et bas dans l'arbre, chacun pour un besoin navigateur précis :

| Composant | Raison |
|---|---|
| `PageReveal` | GSAP, `document.fonts.ready`, `matchMedia` ; `gsap.context().revert()` au nettoyage |
| `Nav` | état du menu mobile, lien actif (`usePathname`), réinitialisé par clé à chaque route ; reçoit l'horloge en prop |
| `PageTransition` | voile WebGL de transition (bruit de dissolution), navigation via le router |
| `Preloader` | animation de chargement GSAP (pile de cartes), une fois par chargement complet |
| `SelectedWorks` | survol d'une ligne → aperçu dans le panneau image (état partagé) |
| `CollectionBrowser` | filtres, recherche, comptes, cartes masquées (`hidden`) |
| `ScrollProgress` | scroll, resize, ResizeObserver |
| `Clock` | `setInterval`, fuseau du musée (site.json), rendu « 00:00 » côté serveur, affichée dans la navigation |
| `TicketForm` | quantités et total en direct, pré-validation, erreurs marquées et focalisées, envoi par Server Action (`useActionState`) |
| `error.js` | page d'erreur de route (contrat Next.js) : texte du site, bouton « Réessayer » |

Les données sont lues côté serveur (`lib/api.js` et `lib/content.js`, gardés par `server-only`) et transmises aux composants client sous forme sérialisable.

## Rendu

- **Cache Components / PPR** : activé (`cacheComponents: true`). Chaque lecture de l'API est une fonction `"use cache"` avec `cacheLife("hours")` et un `cacheTag` (`works`, `archive`, `visit`, `work:<slug>`, `archive:<slug>`). Au build, toutes les routes sont prérendues avec ces données (les routes dynamiques listent leurs slugs avec `generateStaticParams`, lus sur l'API) ; le build affiche chaque route avec une revalidation d'une heure et une expiration d'un jour.
- **ISR** : après une heure, la première requête reçoit la version en cache et déclenche une revalidation en arrière-plan (stale-while-revalidate). Si l'API ne répond pas à ce moment, la version en cache reste servie. Un slug inconnu au build reçoit l'App Shell puis le rendu à la requête, mis en cache à son tour.
- **Invalidation** : `POST /api/revalidate?tag=works` (jeton `REVALIDATE_SECRET`) appelle `revalidateTag(tag, "max")` ; à brancher sur la mise à jour des données de l'API.
- **Requête** : la demande de billets est une Server Action (`requestTickets`) qui transmet la demande à l'API (`POST /tickets`), autorité de validation, puis redirige vers `/visit/confirmed` avec la référence émise par l'API. Les codes d'erreur par champ renvoyés par l'API sont traduits avec les messages du site.
- **PPR** : `/visit/confirmed` lit `searchParams` (référence, date, quantités), une donnée de requête. Le récapitulatif est un composant async derrière `<Suspense>` ; le reste de la page est le shell statique. C'est le seul trou dynamique du site, et il est justifié.

## Images

- Les photographies de la collection et de l'archive sont servies par l'API depuis son dossier public (3:4 ou 4:3, 2000 px environ) ; `next/image` les redimensionne et les convertit (WebP, AVIF) à la demande selon `sizes` (`images.remotePatterns`, chemin `/images/**` uniquement). Les dimensions intrinsèques sont connues, donc aucun layout shift.
- Les aperçus au survol de la home (`SelectedWorks`) sont les candidats `src`, `srcSet` et `sizes` produits côté serveur par `getImageProps` (next/image) : le navigateur charge la taille du panneau, jamais l'original de l'API, et ne précharge rien sur les écrans sans survol.
- Les tableaux (`category: "work"` dans l'API) s'affichent entiers dans leur cadre 3:4, sur le fond gris, au lieu d'être recadrés (`contain` de `sheetSize`, classe `is-contained`) ; leur année, non documentée, est affichée « Non datée ».
- Les intérieurs de la maison passent par le filtre `--image-filter: grayscale(1)` (token de `tokens.css`) ; les œuvres, les espaces et les photographies d'auteur sont en couleur (option `color` de `SiteImage`, classe `is-color`).

## Métadonnées et SEO

- `metadataBase` vient de `SITE_URL` (`lib/metadata.js`) ; chaque page a son titre (template `Fondation César Manrique — %s`), sa description et son URL canonique, dont Open Graph hérite. Le layout ne fixe que `siteName`, `type` et `locale`.
- Image de partage : `app/opengraph-image.jpg` (fenêtre du salon, 1200 × 630) pour tout le site ; chaque fiche de la collection et chaque entrée d'archive partage sa propre photographie, servie par l'optimiseur du site en 1200 px (`shareImage`). Une page qui définit `openGraph` repart de `OPEN_GRAPH` : Next.js remplace l'objet, il ne le fusionne pas.
- `sitemap.xml` et `robots.txt` sont générés (`app/sitemap.js`, `app/robots.js`) ; `/visit/confirmed` est en `noindex` et exclue.

## Décisions de design et de rendu

- Le CSS du site (`src/styles`) est écrit à la main, avec ses tokens ; Tailwind est installé sans Preflight et exposé avec les tokens de la DA pour les ajouts.
- Les textes apparaissent par masque de lignes (`Lines`) : une ligne rendue côté serveur pour les textes courts, SplitText pour les paragraphes multilignes. Le texte reste du texte, lisible par les lecteurs d'écran.
- L'état initial masqué des apparitions dépend de la classe `js` de `<html>`, posée par un script inline du layout racine avant le premier rendu, et non dans le JSX : sans JavaScript, le contenu reste visible. Si l'apparition n'a pas eu lieu après 6 s (script en échec), un filet CSS (`animations.css`) réaffiche le contenu.
- La classe `is-revealed` est posée sur `<main>` et non sur `<html>` : en navigation client, chaque page arrive masquée et rejoue son apparition.
- La page Visit vit à `/visit` ; `/contact` et `/tickets` y redirigent.

## Transition entre pages

Au clic sur un lien interne, un voile plein écran, du gris de la barre de navigation, se forme par dissolution de bruit (1 s, `power1.in`), la route est poussée dans le router derrière le voile, puis le voile se dissout (1 s) pendant que la page joue ses apparitions. Le voile est un shader de bruit en WebGL natif, sans Three.js : Next.js assure la navigation et `PageReveal` attend le signal d'entrée. La couleur du voile est le token `--color-transition`. Sans WebGL ou avec `prefers-reduced-motion`, la navigation est simplement différée de 120 ms.

## Preloader

Au chargement complet d'une page, `Preloader` (client, rendu côté serveur pour couvrir la page dès le premier octet) joue une pile de cartes : cinq photographies de la sélection de la home s'empilent (ressort), tombent une à une, puis le fond gris glisse vers le bas pendant que `<main>` arrive à l'échelle 1 et que la page joue ses apparitions (signal `enter()` de `lib/transition.js`, le même que pour la transition entre pages). Le composant se retire du DOM à la fin ; les navigations client ne le rejouent pas. `prefers-reduced-motion` le saute.

## Conventions

- La DA, les espacements, les animations et le responsive ne se modifient pas sans décision explicite. Le CSS de `src/styles` est la référence ; Tailwind sert aux ajouts, pas aux réécritures.
- Server Components par défaut ; `"use client"` uniquement pour un besoin navigateur (état, événements, GSAP, APIs du DOM), au plus bas de l'arbre. Les données passent par `src/lib/content.js` (serveur) puis par props sérialisables.
- Toute animation GSAP vit dans un `useEffect` avec nettoyage (`gsap.context().revert()`) : avec Cache Components, une route masquée puis réaffichée rejoue ses effets.
- Les textes et libellés viennent de `src/data/site.json` ; la collection, l'archive et la visite viennent de l'API (`src/lib/api.js`) : pas de texte ni de donnée en dur dans les composants.
- Toute lecture de l'API est une fonction `"use cache"` de `src/lib/api.js` avec `cacheLife("hours")` et un `cacheTag` ; les pages appellent `src/lib/content.js`, jamais `fetch`. Une nouvelle ressource = une fonction dans `api.js`, une vue dans `content.js`, un tag accepté par `src/app/api/revalidate/route.js`.
- Les images sont des URL complètes fournies par l'API (chemin `/images/**` dans `images.remotePatterns`) ou des chemins `/images/…` du dossier `public` du site pour `site.json` ; `SiteImage` (next/image) reçoit toujours `width`, `height` et un `sizes` adapté à la grille. Une image hors `next/image` (aperçu au survol) prend ses candidats de `getImageProps`, jamais l'URL de l'API. Les tableaux s'affichent entiers (`contain`), jamais recadrés.
- Métadonnées : `metadataBase`, Open Graph commun (`OPEN_GRAPH`) et image de partage d'une fiche (`shareImage`) viennent de `src/lib/metadata.js`. Chaque page déclare `title`, `description` et `alternates.canonical` ; une page qui définit `openGraph` repart de `OPEN_GRAPH` (Next.js remplace l'objet, il ne le fusionne pas). Une nouvelle route publique s'ajoute à `src/app/sitemap.js`.
- Billetterie : `requestTickets` (`src/features/tickets/actions.js`) transmet la demande à l'API (`POST /tickets`) et traduit ses codes d'erreur par champ avec `site.tickets.errors` ; la validation locale de `TicketForm` n'est qu'une pré-validation. La référence émise par l'API est affichée telle quelle (format opaque, `REFERENCE` dans `src/lib/tickets.js`).
- Transition entre pages : `PageTransition` (voile WebGL, `src/lib/noise-overlay.js`) et `src/lib/transition.js` ; toute nouvelle page passe par `PageReveal`, qui attend le signal d'entrée pendant une transition. Sans `PageReveal`, une page resterait masquée.
- Texte révélé : composant `Lines` (`split` pour le multiligne) et `data-reveal="lines"` ; pas de découpe par caractères. La classe `js` de `<html>` est posée par le script inline du layout racine, jamais dans le JSX : sans JavaScript, le contenu reste visible.
- Le build a besoin de l'API (`FCM_API_URL`, `http://localhost:4000` par défaut) : lancer `museum-api` avant `npm run build`.

## Fonctionnalités

- Collection (espaces conçus par César Manrique et tableaux), archive photographique et informations de visite lues sur l'API de la Fondation, mises en cache et revalidées (Cache Components).
- Apparition des textes par masque de lignes, discrète (0,8 s, expo.out, 0,08 s entre lignes et entre éléments d'une liste).
- Transition entre pages (voile de bruit WebGL).
- Preloader (pile de cartes qui tombent).
- Billetterie sur la page Visit (`/visit`) : jour d'ouverture (liste fournie par l'API), billets plein / réduit / moins de 18 ans, total en direct, validation immédiate avec erreurs en couleur (seule couleur du site, `--color-error`) et focus sur le premier champ en erreur, demande transmise à l'API par Server Action, page de confirmation `/visit/confirmed` avec référence et récapitulatif. Démonstration : aucun billet n'est réservé auprès de la Fondation.
- Recherche dans la Collection (titre, artiste, type, année), instantanée, insensible à la casse et aux accents, combinée aux filtres.
- Favicon monochrome, page 404, page d'erreur, métadonnées (title template, description, Open Graph, canonical, sitemap, robots), labels de formulaire associés, texte des apparitions lisible par les lecteurs d'écran.
