"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { SLOW_DOWN } from "@/lib/access";
import { emailConfigured, sendEmail, templates } from "@/lib/email";
import { newId, newToken } from "@/lib/ids";
import { allow, allowAction, getBaseUrl } from "@/lib/request";
import { endSession, getViewer, hashToken, startSession } from "@/lib/session";
import { fail, ok, type ActionResult } from "@/lib/utils";
import { emailSchema } from "@/lib/validation";

const { users, loginTokens, events, guests } = schema;
const TOKEN_TTL_MS = 20 * 60_000;

/** Emails a one-time sign-in link. Passwordless: nothing to remember or leak. */
export async function requestLogin(rawEmail: string): Promise<ActionResult<{ devLink: string | null }>> {
  const parsed = emailSchema.safeParse(rawEmail.trim().toLowerCase());
  if (!parsed.success) return fail("That email doesn’t look right.", { email: "That email doesn’t look right" });
  const email = parsed.data;
  if (!(await allowAction("login", 5, 10 * 60_000)) || !allow(`login-to:${email}`, 3, 10 * 60_000)) {
    return fail(SLOW_DOWN);
  }

  const viewer = await getViewer();
  const token = newToken();
  const now = Date.now();
  await db.insert(loginTokens).values({
    id: hashToken(token),
    email,
    requestedBy: viewer?.id ?? null,
    expiresAt: now + TOKEN_TTL_MS,
    createdAt: now,
  });

  const link = `${await getBaseUrl()}/auth/verify?token=${token}`;
  await sendEmail({ to: email, ...templates.magicLink(link), kind: "magic-link" });

  // Without an email provider, local development gets the link directly.
  const devLink = !emailConfigured() && process.env.NODE_ENV !== "production" ? link : null;
  return ok({ devLink });
}

/**
 * Completes sign-in. Runs from a button press rather than on page load so
 * that mail scanners which pre-open links cannot burn the one-time token.
 */
export async function confirmLogin(token: string): Promise<ActionResult> {
  if (!(await allowAction("verify", 10))) return fail(SLOW_DOWN);
  const id = hashToken(token);
  const row = (await db.select().from(loginTokens).where(eq(loginTokens.id, id)).limit(1))[0];
  if (!row || row.usedAt || row.expiresAt < Date.now()) {
    return fail("This sign-in link has expired or was already used. Ask for a new one.");
  }
  await db.update(loginTokens).set({ usedAt: Date.now() }).where(eq(loginTokens.id, id));

  const viewer = await getViewer();
  const owner = (await db.select().from(users).where(eq(users.email, row.email)).limit(1))[0];
  let userId: string;

  if (owner) {
    userId = owner.id;
    // Fold this device’s unsaved invites and replies into the email account.
    if (viewer && viewer.id !== owner.id && !viewer.email) {
      await db.update(events).set({ hostId: owner.id }).where(eq(events.hostId, viewer.id));
      const already = await db.select({ eventId: guests.eventId }).from(guests).where(eq(guests.userId, owner.id));
      const taken = already.map((g) => g.eventId);
      await db
        .update(guests)
        .set({ userId: owner.id })
        .where(taken.length ? and(eq(guests.userId, viewer.id), notInArray(guests.eventId, taken)) : eq(guests.userId, viewer.id));
      await db.delete(users).where(and(eq(users.id, viewer.id), isNull(users.email)));
    }
  } else if (viewer && !viewer.email) {
    userId = viewer.id;
    await db.update(users).set({ email: row.email }).where(eq(users.id, viewer.id));
  } else {
    userId = newId();
    await db.insert(users).values({ id: userId, email: row.email, createdAt: Date.now() });
  }

  // Always rotate the session on sign-in.
  await endSession();
  await startSession(userId);
  redirect("/events?welcome=1");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}
