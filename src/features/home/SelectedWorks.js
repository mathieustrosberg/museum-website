"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Lines from "@/components/Lines";
import SiteImage from "@/components/SiteImage";

/**
 * Rangée basse de la home : panneau image à gauche, sélection d'œuvres à droite.
 * Client Component parce que le survol d'une ligne remplace l'image du panneau
 * par l'aperçu de l'œuvre (état partagé entre les lignes et le média). Le label,
 * les en-têtes et le footer sont reçus en props ; le footer reste rendu serveur.
 */
export default function SelectedWorks({
  media,
  works,
  label,
  table,
  viewAll,
  footer,
}) {
  const [preview, setPreview] = useState(null);
  const [active, setActive] = useState(false);
  const previewRef = useRef(null);

  // Précharge les aperçus pour un swap sans latence.
  useEffect(() => {
    for (const work of works) {
      const img = new Image();
      img.src = work.preview;
    }
  }, [works]);

  // Nouvel aperçu : la classe est retirée puis reposée après un reflow forcé,
  // pour que la transition reparte de scale(1.06).
  useLayoutEffect(() => {
    if (!preview) return;
    void previewRef.current?.offsetWidth;
    setActive(true);
  }, [preview]);

  const show = (src) => {
    if (src !== preview) {
      setActive(false);
      setPreview(src);
    } else {
      setActive(true);
    }
  };
  const hide = () => setActive(false);

  return (
    <div className="grid-2 home__bottom">
      <div
        className={
          active ? "media home__media is-preview" : "media home__media"
        }
        id="home-media"
        data-reveal="scale"
        data-scale="0.9"
        data-delay="0.5"
        data-duration="1.5"
        data-delay-tablet="1"
        data-duration-tablet="1.2"
        data-delay-mobile="1.2"
        data-duration-mobile="1.2"
      >
        <SiteImage
          className="media__img"
          src={media.src}
          alt={media.alt}
          width={media.width}
          height={media.height}
        />
        {/* biome-ignore lint/performance/noImgElement: source échangée au survol, placeholders non optimisés */}
        <img
          ref={previewRef}
          decoding="async"
          className="media__preview"
          src={preview ?? undefined}
          alt=""
          width={media.width}
          height={media.height}
          aria-hidden="true"
        />
      </div>

      <div className="home__works">
        <div className="home__works-head">
          <Lines as="h2" className="label label--strong">
            {label}
          </Lines>

          <div className="home__works-list">
            <div className="table">
              <div className="table__head" aria-hidden="true">
                <div className="table__half">
                  <Lines as="div" className="table__cell table__cell--date">
                    {table.year}
                  </Lines>
                  <Lines as="div" className="table__cell">
                    {table.title}
                  </Lines>
                </div>
                <div className="table__half">
                  <Lines as="div" className="table__cell">
                    {table.artist}
                  </Lines>
                  <Lines as="div" className="table__cell table__cell--count">
                    {table.count}
                  </Lines>
                </div>
              </div>

              {/* biome-ignore lint/a11y/noStaticElementInteractions: survol uniquement, l'équivalent clavier est le focus/blur des liens */}
              <div
                className="table__body"
                id="project-rows"
                data-reveal-each="fade-up"
                data-y="20"
                data-delay="0.9"
                data-stagger="0.05"
                onMouseLeave={hide}
              >
                {works.map((work) => (
                  <Link
                    key={work.slug}
                    className="row"
                    href={`/work/${work.slug}`}
                    data-preview={work.preview}
                    onMouseEnter={() => show(work.preview)}
                    onFocus={() => show(work.preview)}
                    onBlur={hide}
                  >
                    <div className="row__half">
                      <div className="row__cell row__cell--date">
                        <span className="row__text">{work.year}</span>
                      </div>
                      <div className="row__cell">
                        <h3 className="row__text">{work.title}</h3>
                      </div>
                    </div>
                    <div className="row__half">
                      <div className="row__cell">
                        <span className="row__text">{work.artist}</span>
                      </div>
                      <div className="row__cell row__cell--count">
                        <span className="row__text">[{work.sheets}]</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <Link
              className="link-underline"
              href="/work"
              data-reveal="fade-up"
              data-y="20"
              data-delay="1.4"
            >
              {viewAll}
            </Link>
          </div>
        </div>

        {footer}
      </div>
    </div>
  );
}
