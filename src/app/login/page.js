import AuthPage from "@/features/account/AuthPage";
import { site } from "@/lib/content";

export const metadata = {
  title: site.titles.login,
  description: site.meta.login,
  robots: { index: false },
};

/** Connexion : e-mail et mot de passe (features/account/AuthPage). */
export default function LoginPage({ searchParams }) {
  return <AuthPage kind="login" searchParams={searchParams} />;
}
