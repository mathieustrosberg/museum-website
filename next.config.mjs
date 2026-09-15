/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mémoïsation automatique des composants (babel-plugin-react-compiler).
  reactCompiler: true,
  // Modèle de rendu Next.js 16 : Cache Components. Chaque route produit un shell
  // statique prérendu (Partial Prerendering par défaut) ; "use cache", cacheLife et
  // cacheTag sont disponibles pour le contenu à mettre en cache lorsque l'API arrivera.
  cacheComponents: true,
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
