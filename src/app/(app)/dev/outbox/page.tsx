import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { desc } from "drizzle-orm";
import { RichText } from "@/components/event/rich-text";
import { db, schema } from "@/db";
import { emailConfigured } from "@/lib/email";
import { requestNow } from "@/lib/request";
import { timeAgo } from "@/lib/time";

export const metadata: Metadata = { title: "Dev outbox", robots: { index: false } };

/**
 * Local stand-in for an inbox: lists every email the app has recorded.
 * It exposes sign-in links, so it only exists outside production unless
 * PUNCHFACE_DEV_OUTBOX=1 is set deliberately.
 */
const enabled = () => process.env.NODE_ENV !== "production" || process.env.PUNCHFACE_DEV_OUTBOX === "1";

export default function OutboxPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 sm:px-6">
      <h1 className="display text-[2.25rem]">Dev outbox</h1>
      <Suspense fallback={<div className="skeleton mt-6 h-40 !rounded-[20px]" />}>
        <Outbox />
      </Suspense>
    </div>
  );
}

async function Outbox() {
  await connection();
  if (!enabled()) notFound();
  const emails = await db.select().from(schema.emails).orderBy(desc(schema.emails.createdAt)).limit(60);
  const now = await requestNow();
  return (
    <>
      <p className="mt-2 text-muted">
        {emailConfigured()
          ? "Email delivery is on. This is a log of what was sent."
          : "No email provider is configured (set RESEND_API_KEY), so messages stop here instead of being delivered."}
      </p>
      {emails.length === 0 ? (
        <p className="card mt-6 p-5 font-semibold">Nothing sent yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {emails.map((m) => (
            <li key={m.id} className="card overflow-hidden">
              <details>
                <summary className="flex min-h-14 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <span className="chip !min-h-7 text-xs">{m.kind}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{m.subject}</span>
                  <span className="text-sm text-muted">
                    {m.to} · {timeAgo(m.createdAt, now)} · {m.status}
                  </span>
                </summary>
                <RichText text={m.text} className="border-t-2 border-line/15 p-4 text-sm" />
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
