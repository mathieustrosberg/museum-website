import AuthPage from "@/features/account/AuthPage";
import { site } from "@/lib/content";

export const metadata = {
  title: site.titles.signup,
  description: site.meta.signup,
  robots: { index: false },
};

/** Inscription : nom, e-mail et mot de passe (features/account/AuthPage). */
export default function SignupPage({ searchParams }) {
  return <AuthPage kind="signup" searchParams={searchParams} />;
}
