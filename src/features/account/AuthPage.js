import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Lines from "@/components/Lines";
import PageReveal from "@/components/PageReveal";
import SiteImage from "@/components/SiteImage";
import AuthForm from "@/features/account/AuthForm";
import { signIn, signUp } from "@/features/account/actions";
import { getSession, MIN_PASSWORD_LENGTH } from "@/lib/auth";
import { getWork, sheetSize, site, workImages } from "@/lib/content";

/**
 * Page de connexion ou d'inscription (Server Component), sur le modèle des
 * pages À propos et Visite : à gauche le titre, une phrase et le formulaire,
 * centrés ; à droite une photographie de la collection (fiche et numéro de
 * photo choisis dans site.json, `image`). Le titre, le texte et l'image sont le shell statique ; le
 * formulaire dépend de la requête (session : un compte connecté est renvoyé
 * vers Compte ; `next` : page à rejoindre après connexion), donc rendu derrière <Suspense>.
 */
const KINDS = {
  login: { action: signIn, fields: ["email", "password"], other: "/signup" },
  signup: {
    action: signUp,
    fields: ["name", "email", "password"],
    other: "/login",
  },
};

export default async function AuthPage({ kind, searchParams }) {
  const texts = site.account[kind];
  const work = await getWork(texts.image.work);
  const src = work && workImages(work)[texts.image.sheet - 1];
  const image = src ? { src, ...sheetSize(work) } : null;

  return (
    <PageReveal>
      <section className="auth">
        <div className="auth__text">
          <div className="info">
            <Lines as="h1" className="label label--strong">
              {texts.title}
            </Lines>
            <Lines split className="prose">
              {texts.intro}
            </Lines>
          </div>
          <Suspense fallback={<div className="form" aria-busy="true" />}>
            <Panel kind={kind} searchParams={searchParams} />
          </Suspense>
        </div>

        {image ? (
          <div
            className="media auth__media"
            data-reveal="scale"
            data-scale="0.9"
            data-delay="0.5"
            data-duration="0.6"
          >
            <SiteImage
              src={image.src}
              alt={work.title}
              width={image.width}
              height={image.height}
              color={image.color}
              contain={image.contain}
              sizes="(max-width: 1159px) 100vw, 50vw"
            />
          </div>
        ) : null}
      </section>

      <Footer page delay="0.9" />
    </PageReveal>
  );
}

async function Panel({ kind, searchParams }) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (session) redirect("/account");

  const { action, fields, other } = KINDS[kind];
  const texts = site.account[kind];
  const next = typeof params.next === "string" ? params.next : undefined;
  const otherHref = next ? `${other}?next=${encodeURIComponent(next)}` : other;

  return (
    <>
      <AuthForm
        action={action}
        fields={fields}
        minPasswordLength={MIN_PASSWORD_LENGTH}
        next={next}
        labels={site.account.form}
        hints={kind === "signup" ? site.account.form.hints : {}}
        text={texts}
        messages={site.account.errors}
        data-reveal="fade-up"
        data-y="24"
        data-delay="0.4"
      />
      <p
        className="auth__switch"
        data-reveal="fade-up"
        data-y="12"
        data-delay="0.6"
      >
        <span className="is-muted">{texts.switchText}</span>
        <Link className="link-underline" href={otherHref}>
          {texts.switchLink}
        </Link>
      </p>
    </>
  );
}
