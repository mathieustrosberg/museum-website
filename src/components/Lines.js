/**
 * Texte révélé par masque de lignes :
 * chaque ligne glisse vers le haut depuis 110 % à l'intérieur d'un masque
 * à overflow clip. Le texte reste du texte, lisible par les lecteurs d'écran.
 *
 * - Par défaut, une seule ligne : le masque et la ligne sont rendus côté serveur,
 *   aucune découpe au runtime, aucune mutation du DOM.
 * - `split` : texte multiligne (paragraphes .prose) découpé en lignes par
 *   SplitText au chargement des fontes, avec un masque par ligne.
 *
 * <Lines as="h1" className="label">Collection</Lines>
 * <Lines split className="prose">Long paragraph…</Lines>
 */
export default function Lines({
  as: Tag = "p",
  split = false,
  children,
  ...props
}) {
  if (split) {
    return (
      <Tag data-reveal="lines" data-split="lines" {...props}>
        {children}
      </Tag>
    );
  }
  return (
    <Tag data-reveal="lines" {...props}>
      <span className="line-mask">
        <span className="line">{children}</span>
      </span>
    </Tag>
  );
}
