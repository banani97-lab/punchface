import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Invite link not found", robots: { index: false } };

export default function GonePage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-20 pt-16 text-center sm:px-6">
      <p className="text-6xl" aria-hidden="true">🫥</p>
      <h1 className="display mt-4 text-[2.5rem]">That invite link doesn’t work any more</h1>
      <p className="mt-3 text-muted">
        The host may have removed you from the list or deleted the event. Ask them for a fresh link.
      </p>
      <Link href="/" className="btn btn-primary mt-8">Back to punchface</Link>
    </div>
  );
}
