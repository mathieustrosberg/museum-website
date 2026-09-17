"use client";

import { useId, useState } from "react";
import Lines from "@/components/Lines";
import ScrollProgress from "@/components/ScrollProgress";
import WorkCard from "@/components/WorkCard";

/**
 * Filtres et recherche de la Collection. Client Component : c'est le seul état
 * interactif de la page. Il reçoit du serveur un index sérialisable des œuvres
 * et rend la grille (WorkCard) et le bloc de filtres. Une carte hors sélection
 * reçoit `hidden`, les 12 restent dans le DOM : l'apparition en cascade de la
 * grille est intacte et le pourcentage de scroll suit la hauteur de la page.
 *
 * Une portée (toute la collection, tableaux, espaces, en exposition), un type
 * et un lieu (activables et désactivables) et la recherche (titre, artiste,
 * type, année) se combinent en ET. Les comptes entre
 * crochets suivent la sélection, un bouton sans correspondance est désactivé, une
 * zone de statut annonce le résultat aux lecteurs d'écran.
 */
const normalize = (s) =>
  String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );

export default function CollectionBrowser({
  works,
  mediums,
  locations,
  labels,
  footer,
}) {
  const [scope, setScope] = useState(labels.scopes[0].value);
  const [medium, setMedium] = useState(null);
  const [location, setLocation] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const searchId = useId();

  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const inScope = (work, value) => value === "all" || work.category === value;
  const inMedium = (work, value) => !value || work.medium === value;
  const inLocation = (work, value) => !value || work.location === value;
  const inQuery = (work) =>
    tokens.every((token) => work.haystack.includes(token));
  const matches = (work, s, m, l) =>
    inScope(work, s) &&
    inMedium(work, m) &&
    inLocation(work, l) &&
    inQuery(work);

  const shown = works.filter((work) => matches(work, scope, medium, location));
  const countScope = (value) =>
    works.filter((work) => matches(work, value, medium, location)).length;
  const countMedium = (value) =>
    works.filter((work) => matches(work, scope, value, location)).length;
  const countLocation = (value) =>
    works.filter((work) => matches(work, scope, medium, value)).length;
  const name = (label, n) =>
    fill(n === 1 ? labels.a11y.count.one : labels.a11y.count.other, {
      label,
      n,
    });

  const announce = (next) => {
    const n = works.filter((work) =>
      matches(work, next.scope, next.medium, next.location),
    ).length;
    setStatus(fill(labels.a11y.status, { shown: n, total: works.length }));
  };
  const selectScope = (value) => {
    if (value === scope) return;
    setScope(value);
    announce({ scope: value, medium, location });
  };
  const toggleMedium = (value) => {
    const next = medium === value ? null : value;
    setMedium(next);
    announce({ scope, medium: next, location });
  };
  const toggleLocation = (value) => {
    const next = location === value ? null : value;
    setLocation(next);
    announce({ scope, medium, location: next });
  };
  const search = (value) => {
    setQuery(value);
    // La recherche recompte à la frappe : l'annonce est faite avec la valeur saisie.
    const t = normalize(value).split(/\s+/).filter(Boolean);
    const n = works.filter(
      (work) =>
        inScope(work, scope) &&
        inMedium(work, medium) &&
        inLocation(work, location) &&
        t.every((x) => work.haystack.includes(x)),
    ).length;
    setStatus(fill(labels.a11y.status, { shown: n, total: works.length }));
  };

  const button = (filter, value, label, count, pressed, onClick) => (
    <li key={value}>
      <Lines
        as="button"
        className="filter"
        type="button"
        data-filter={filter}
        data-value={value}
        aria-pressed={pressed}
        aria-label={name(label, count)}
        disabled={count === 0 && !pressed}
        onClick={onClick}
      >
        {`${label} [${count}]`}
      </Lines>
    </li>
  );

  return (
    <>
      <div
        className="work__grid"
        data-reveal-each="fade-up"
        data-y="60"
        data-delay="0.1"
        data-stagger="0.1"
      >
        {works.map((work, i) => (
          <WorkCard
            key={work.slug}
            work={work}
            image={work.image}
            lazy={i >= 4}
            titleAs="h2"
            data-medium={work.medium}
            data-location={work.location}
            hidden={!shown.includes(work)}
          />
        ))}
      </div>

      <aside className="work__side">
        <div className="work__side-main">
          <ScrollProgress />

          <div className="work__filters">
            <div className="info">
              <Lines as="h1" className="label" id="filter-scope">
                {labels.title}
              </Lines>
              <ul className="list" aria-labelledby="filter-scope">
                {labels.scopes.map((s) =>
                  button(
                    "scope",
                    s.value,
                    s.label,
                    countScope(s.value),
                    scope === s.value,
                    () => selectScope(s.value),
                  ),
                )}
              </ul>
            </div>
            <div className="info">
              <Lines as="p" className="label" id="filter-medium">
                {labels.mediumLabel}
              </Lines>
              <ul className="list" aria-labelledby="filter-medium">
                {mediums.map((m) =>
                  button("medium", m, m, countMedium(m), medium === m, () =>
                    toggleMedium(m),
                  ),
                )}
              </ul>
            </div>
            <div className="info">
              <Lines as="p" className="label" id="filter-location">
                {labels.locationLabel}
              </Lines>
              <ul className="list" aria-labelledby="filter-location">
                {locations.map((l) =>
                  button(
                    "location",
                    l,
                    l,
                    countLocation(l),
                    location === l,
                    () => toggleLocation(l),
                  ),
                )}
              </ul>
            </div>
            {/* biome-ignore lint/a11y/useSemanticElements: le <form> est aussi le conteneur flex du bloc (.info) */}
            <form
              className="info work__search"
              role="search"
              onSubmit={(e) => e.preventDefault()}
            >
              <Lines as="label" className="label" htmlFor={searchId}>
                {labels.search.label}
              </Lines>
              <div
                className="field"
                data-reveal="fade-up"
                data-y="12"
                data-delay="0.5"
                data-duration="0.4"
              >
                <span className="field__box">
                  <input
                    id={searchId}
                    type="search"
                    name="q"
                    placeholder={labels.search.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    value={query}
                    onChange={(e) => search(e.target.value)}
                  />
                </span>
              </div>
            </form>
            <output className="visually-hidden">{status}</output>
          </div>
        </div>

        {footer}
      </aside>
    </>
  );
}
