/** Hôte de l'API (photographies de la collection et de l'archive, servies depuis son dossier public). */
const api = new URL(process.env.FCM_API_URL ?? "http://localhost:4000");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mémoïsation automatique des composants (babel-plugin-react-compiler).
  reactCompiler: true,
  // Modèle de rendu Next.js 16 : Cache Components. Chaque route produit un shell
  // statique prérendu (Partial Prerendering par défaut) ; les lectures de l'API
  // sont des scopes "use cache" (cacheLife, cacheTag) dans src/lib/api.js.
  cacheComponents: true,
  // Photographies servies par l'API depuis son dossier /images : next/image les
  // optimise à la demande (seul ce chemin est accepté par l'optimiseur).
  images: {
    remotePatterns: [
      {
        protocol: api.protocol.replace(":", ""),
        hostname: api.hostname,
        port: api.port,
        pathname: "/images/**",
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
