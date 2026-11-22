"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-6xl" aria-hidden="true">🫠</p>
      <h1 className="display mt-4 text-[2.5rem]">Well, that wasn’t supposed to happen</h1>
      <p className="mt-3 text-muted">Something broke on our side. Your invites and replies are safe.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        {/* A full page load recovers from errors a client-side navigation can’t. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="btn">Home</a>
      </div>
      {error.digest ? <p className="mt-6 text-xs text-muted">Reference: {error.digest}</p> : null}
    </main>
  );
}
