import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmLogin } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Finish signing in", robots: { index: false } };

export default function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
      <h1 className="display text-[clamp(2.25rem,1.6rem+3vw,3rem)]">Almost there</h1>
      <p className="mt-3 text-muted">One tap to finish signing in on this device.</p>
      <Suspense fallback={<div className="skeleton mt-8 h-14" />}>
        <Verify searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Verify({ searchParams }: Pick<PageProps<"/auth/verify">, "searchParams">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || token.length < 16) {
    return (
      <p className="mt-8">
        This sign-in link is missing its code. <Link href="/login" className="linkish">Get a new link</Link>
      </p>
    );
  }
  return <ConfirmLogin token={token} />;
}
