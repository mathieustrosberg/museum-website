/** Hôte de l'API (photographies de l'archive servies depuis son dossier public). */
const api = new URL(process.env.FCM_API_URL ?? "http://localhost:4000");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mémoïsation automatique des composants (babel-plugin-react-compiler).
  reactCompiler: true,
  // Modèle de rendu Next.js 16 : Cache Components. Chaque route produit un shell
  // statique prérendu (Partial Prerendering par défaut) ; "use cache", cacheLife et
  // cacheTag sont disponibles pour le contenu à mettre en cache lorsque l'API arrivera.
  cacheComponents: true,
  // Photographies servies par le CDN d'Unsplash (œuvres) ou par l'API (archive) :
  // next/image les optimise à la demande.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      {
        protocol: api.protocol.replace(":", ""),
        hostname: api.hostname,
        port: api.port,
      },
    ],
    // En développement, l'API tourne sur localhost : next/image refuse par défaut
    // les adresses privées (protection SSRF). Autorisé uniquement dans ce cas.
    dangerouslyAllowLocalIP: ["localhost", "127.0.0.1"].includes(api.hostname),
  },
  // Racine du projet pour Turbopack (un lockfile parent hors dépôt serait sinon pris en compte).
  turbopack: { root: import.meta.dirname },
  // Anciennes adresses de la page Visit (contact) et de la billetterie, fusionnées.
  async redirects() {
    return [
      { source: "/contact", destination: "/visit", permanent: true },
      { source: "/tickets", destination: "/visit", permanent: true },
    ];
  },
};

export default nextConfig;
