import Link from "next/link";
import Lines from "@/components/Lines";

/** Bloc « label + contenu » (gap 16px). */
export function Info({ label, labelAs = "p", labelId, className, children }) {
  return (
    <div className={className ? `info ${className}` : "info"}>
      <Lines as={labelAs} className="label" id={labelId}>
        {label}
      </Lines>
      {children}
    </div>
  );
}

/** Liste de lignes de texte ; un item peut être un lien interne { text, href }. */
export function TextList({ items, className }) {
  return (
    <ul className={className ? `list ${className}` : "list"}>
      {items.map((item) =>
        typeof item === "string" ? (
          <Lines key={item} as="li">
            {item}
          </Lines>
        ) : (
          <Lines key={item.text} as="li">
            <Link href={item.href}>{item.text}</Link>
          </Lines>
        ),
      )}
    </ul>
  );
}
