import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with a one-time email link. No password.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
      <h1 className="display text-[clamp(2.25rem,1.6rem+3vw,3rem)]">Save your invites</h1>
      <p className="mt-3 text-muted">
        Enter your email and we’ll send a one-time sign-in link. No password to remember. Anything you’ve made or replied
        to on this device comes with you.
      </p>
      <LoginForm />
    </div>
  );
}
