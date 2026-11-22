"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Guest } from "@/db/schema";
import { NOT_ALLOWED, SLOW_DOWN, requireHost } from "@/lib/access";
import { promoteWaitlist } from "@/lib/data";
import { emailConfigured } from "@/lib/email";
import { newId, newToken } from "@/lib/ids";
import { sendInvite, sendNudge, sendRsvpConfirmation, sendUpdateToGuests } from "@/lib/notify";
import { allowAction, getBaseUrl } from "@/lib/request";
import { fail, ok, plural, type ActionResult } from "@/lib/utils";
import { parseGuestList } from "@/lib/validation";

const { guests, posts } = schema;

const deliveryNote = () =>
  emailConfigured() ? "" : " Email delivery isn’t set up, so messages were saved to the dev outbox instead.";

/** Adds guests from a pasted list and, optionally, emails each a personal invite link. */
export async function addGuests(
  eventId: string,
  raw: string,
  send: boolean,
): Promise<ActionResult<{ added: number; skipped: number; sent: number }>> {
  if (!(await allowAction("add-guests", 10))) return fail(SLOW_DOWN);
  const access = await requireHost(eventId);
  if (!access) return fail(NOT_ALLOWED);

  const parsedList = parseGuestList(raw);
  if (parsedList.length === 0) return fail("No email addresses found. Try one per line, like “Sam sam@example.com”.");
  if (parsedList.length > 200) return fail("That’s over 200 at once. Add them in a couple of batches.");

  const existing = await db.select({ email: guests.email }).from(guests).where(eq(guests.eventId, eventId));
  const have = new Set(existing.map((g) => g.email).filter(Boolean));
  const now = Date.now();
  const fresh: Guest[] = parsedList
    .filter((g) => !have.has(g.email))
    .map((g) => ({
      id: newId(),
      eventId,
      token: newToken(),
      userId: null,
      name: g.name,
      email: g.email,
      status: "invited" as const,
      plusOnes: 0,
      note: "",
      emailOptOut: false,
      inviteSentAt: null,
      nudgeSentAt: null,
      reminderSentAt: null,
      respondedAt: null,
      createdAt: now,
    }));
  if (fresh.length) await db.insert(guests).values(fresh);

  let sent = 0;
  if (send && fresh.length) {
    const base = await getBaseUrl();
    for (const g of fresh) if (await sendInvite(access.event, g, base)) sent += 1;
  }

  refresh();
  const skipped = parsedList.length - fresh.length;
  const parts = [
    `${plural(fresh.length, "guest")} added`,
    sent ? `${plural(sent, "invite")} sent` : "",
    skipped ? `${skipped} already on the list` : "",
  ].filter(Boolean);
  return ok({ added: fresh.length, skipped, sent }, parts.join(" · ") + "." + (sent ? deliveryNote() : ""));
}

/** Emails an invite to every guest with an address who hasn’t been sent one. */
export async function sendPendingInvites(eventId: string): Promise<ActionResult> {
  if (!(await allowAction("send-invites", 6))) return fail(SLOW_DOWN);
  const access = await requireHost(eventId);
  if (!access) return fail(NOT_ALLOWED);
  const list = await db.select().from(guests).where(and(eq(guests.eventId, eventId), eq(guests.status, "invited")));
  const base = await getBaseUrl();
  let sent = 0;
  for (const g of list) if (!g.inviteSentAt && (await sendInvite(access.event, g, base))) sent += 1;
  refresh();
  return ok(undefined, sent ? `${plural(sent, "invite")} sent.${deliveryNote()}` : "Everyone with an email has already been invited.");
}

/** Reminds guests who were invited by email but haven’t replied. */
export async function nudgeNoReplies(eventId: string): Promise<ActionResult> {
  if (!(await allowAction("nudge", 4, 10 * 60_000))) return fail(SLOW_DOWN);
  const access = await requireHost(eventId);
  if (!access) return fail(NOT_ALLOWED);
  const list = await db.select().from(guests).where(and(eq(guests.eventId, eventId), eq(guests.status, "invited")));
  const base = await getBaseUrl();
  const dayAgo = Date.now() - 24 * 3600_000;
  let sent = 0;
  for (const g of list) {
    if (g.nudgeSentAt && g.nudgeSentAt > dayAgo) continue; // at most one nudge a day
    if (await sendNudge(access.event, g, base)) sent += 1;
  }
  refresh();
  return ok(undefined, sent ? `Nudged ${plural(sent, "guest")}.${deliveryNote()}` : "Nobody to nudge right now.");
}

export async function resendInvite(guestId: string): Promise<ActionResult> {
  if (!(await allowAction("resend", 20))) return fail(SLOW_DOWN);
  const guest = (await db.select().from(guests).where(eq(guests.id, guestId)).limit(1))[0];
  if (!guest) return fail("That guest was removed.");
  const access = await requireHost(guest.eventId);
  if (!access) return fail(NOT_ALLOWED);
  const sent = await sendInvite(access.event, guest, await getBaseUrl());
  refresh();
  return sent ? ok(undefined, `Invite sent to ${guest.name}.${deliveryNote()}`) : fail("No email on file for this guest.");
}

/** Host override of a guest’s reply, e.g. for someone who answered by text. */
export async function setGuestStatus(
  guestId: string,
  status: "going" | "maybe" | "declined" | "invited",
): Promise<ActionResult> {
  const guest = (await db.select().from(guests).where(eq(guests.id, guestId)).limit(1))[0];
  if (!guest) return fail("That guest was removed.");
  const access = await requireHost(guest.eventId);
  if (!access) return fail(NOT_ALLOWED);
  await db
    .update(guests)
    .set({ status, respondedAt: status === "invited" ? null : Date.now(), plusOnes: status === "going" ? guest.plusOnes : 0 })
    .where(eq(guests.id, guestId));
  const base = await getBaseUrl();
  for (const g of await promoteWaitlist(access.event)) {
    await sendRsvpConfirmation(access.event, g, base, "A spot opened up. You’re in");
  }
  refresh();
  return ok();
}

/** Adds someone by name only: for guests who replied in person or by text. */
export async function addGuestByName(
  eventId: string,
  name: string,
  status: "going" | "maybe" | "declined",
): Promise<ActionResult> {
  const access = await requireHost(eventId);
  if (!access) return fail(NOT_ALLOWED);
  const clean = name.trim().slice(0, 60);
  if (!clean) return fail("Add a name.");
  const now = Date.now();
  await db.insert(guests).values({
    id: newId(),
    eventId,
    token: newToken(),
    name: clean,
    status,
    respondedAt: now,
    createdAt: now,
  });
  refresh();
  return ok(undefined, `${clean} added.`);
}

export async function removeGuest(guestId: string): Promise<ActionResult> {
  const guest = (await db.select().from(guests).where(eq(guests.id, guestId)).limit(1))[0];
  if (!guest) return ok();
  const access = await requireHost(guest.eventId);
  if (!access) return fail(NOT_ALLOWED);
  await db.delete(guests).where(eq(guests.id, guestId));
  const base = await getBaseUrl();
  for (const g of await promoteWaitlist(access.event)) {
    await sendRsvpConfirmation(access.event, g, base, "A spot opened up. You’re in");
  }
  refresh();
  return ok(undefined, `${guest.name} removed.`);
}

/** Posts a host update on the event page and optionally emails it to guests. */
export async function postUpdate(eventId: string, message: string, email: boolean): Promise<ActionResult> {
  if (!(await allowAction("update", 6, 10 * 60_000))) return fail(SLOW_DOWN);
  const access = await requireHost(eventId);
  if (!access) return fail(NOT_ALLOWED);
  const text = message.trim();
  if (text.length < 2) return fail("Write a message first.");
  if (text.length > 2000) return fail("Keep it under 2,000 characters.");

  await db.insert(posts).values({
    id: newId(),
    eventId,
    guestId: null,
    authorName: access.event.hostName,
    isHost: true,
    kind: "update",
    body: text,
    createdAt: Date.now(),
  });

  let sent = 0;
  if (email) {
    const list = await db.select().from(guests).where(eq(guests.eventId, eventId));
    sent = await sendUpdateToGuests(access.event, list, text, await getBaseUrl());
  }
  refresh();
  return ok(
    undefined,
    email
      ? `Posted${sent ? ` and emailed to ${plural(sent, "guest")}` : ". No guests have an email on file yet"}.${sent ? deliveryNote() : ""}`
      : "Posted to the event page.",
  );
}
