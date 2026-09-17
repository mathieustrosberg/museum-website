/**
 * Données structurées schema.org (JSON-LD) d'une page. Le JSON est sérialisé
 * côté serveur ; « < » est échappé pour qu'aucune valeur ne puisse fermer le
 * script. Les objets viennent des constructeurs de lib/metadata.js.
 */
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON sérialisé par JSON.stringify, « < » échappé
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
