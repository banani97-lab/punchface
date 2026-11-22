import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { newId, newToken } from "./ids";

const COOKIE = "pf_session";
const YEAR_MS = 365 * 24 * 3600 * 1000;

export type Viewer = { id: string; email: string | null; name: string | null };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * The person behind this request, or null. Everyone who creates or answers
 * an invite gets a device-only account first; adding an email later upgrades
 * it. Reads the cookie, so call it inside a <Suspense> boundary.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    // Expiry is checked by the database clock, which keeps this function free
    // of request-time values that Next.js would otherwise flag during prerendering.
    .where(and(eq(schema.sessions.id, hashToken(token)), gt(schema.sessions.expiresAt, sql`(unixepoch() * 1000)`)))
    .limit(1);
  return rows[0] ?? null;
});

/** Starts a fresh session for a user. Server Actions and Route Handlers only. */
export async function startSession(userId: string) {
  const token = newToken();
  const now = Date.now();
  await db.insert(schema.sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: now + YEAR_MS,
    createdAt: now,
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.PUNCHFACE_INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: YEAR_MS / 1000,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  store.delete(COOKIE);
}

/**
 * Returns the current viewer, creating a device-only account on first use.
 * Server Actions and Route Handlers only (it may set a cookie).
 */
export async function ensureViewer(name?: string): Promise<Viewer> {
  const existing = await getViewer();
  if (existing) return existing;
  const id = newId();
  await db.insert(schema.users).values({ id, name: name?.trim() || null, createdAt: Date.now() });
  await startSession(id);
  return { id, email: null, name: name?.trim() || null };
}
