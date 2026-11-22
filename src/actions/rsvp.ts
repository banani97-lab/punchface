"use server";

import { refresh } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Guest, GuestStatus } from "@/db/schema";
import { SLOW_DOWN } from "@/lib/access";
import { findGuestForUser, getEventById, promoteWaitlist, seatsTaken } from "@/lib/data";
import { newId, newToken } from "@/lib/ids";
import { notifyHostOfRsvp, sendRsvpConfirmation } from "@/lib/notify";
import { allowAction, getBaseUrl } from "@/lib/request";
import { ensureViewer, getViewer } from "@/lib/session";
import { fail, ok, type ActionResult } from "@/lib/utils";
import { fieldErrors, rsvpInput } from "@/lib/validation";

const { guests, pollOptions, pollVotes } = schema;

async function replaceVotes(eventId: string, guestId: string, optionIds: string[]) {
  const options = await db.select({ id: pollOptions.id }).from(pollOptions).where(eq(pollOptions.eventId, eventId));
  const valid = new Set(options.map((o) => o.id));
  if (valid.size === 0) return;
  await db.delete(pollVotes).where(and(eq(pollVotes.guestId, guestId), inArray(pollVotes.optionId, [...valid])));
  const chosen = [...new Set(optionIds)].filter((id) => valid.has(id));
  if (chosen.length) {
    await db.insert(pollVotes).values(chosen.map((optionId) => ({ optionId, guestId })));
  }
}

/** Saves the viewer’s reply. No account needed: a name is enough. */
export async function submitRsvp(payload: unknown): Promise<ActionResult<{ status: GuestStatus }>> {
  if (!(await allowAction("rsvp", 20))) return fail(SLOW_DOWN);

  const parsed = rsvpInput.safeParse(payload);
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error));
  const input = parsed.data;

  const event = await getEventById(input.eventId);
  if (!event) return fail("This invite no longer exists.");
  if (event.status === "cancelled") return fail("This event was cancelled.");

  const viewer = await ensureViewer(input.name);
  const existing = await findGuestForUser(event.id, viewer.id);
  const plusOnes =
    input.status === "going" && event.allowPlusOnes ? Math.min(input.plusOnes, event.maxPlusOnes) : 0;

  let status: GuestStatus = input.status;
  if (status === "going" && event.capacity) {
    const taken = await seatsTaken(event.id, existing?.id);
    if (taken + 1 + plusOnes > event.capacity) status = "waitlist";
  }

  const now = Date.now();
  const email = input.email ? input.email.toLowerCase() : (existing?.email ?? null);
  let guest: Guest;
  if (existing) {
    const changes = { name: input.name, email, status, plusOnes, note: input.note, respondedAt: now };
    await db.update(guests).set(changes).where(eq(guests.id, existing.id));
    guest = { ...existing, ...changes };
  } else {
    guest = {
      id: newId(),
      eventId: event.id,
      token: newToken(),
      userId: viewer.id,
      name: input.name,
      email,
      status,
      plusOnes,
      note: input.note,
      emailOptOut: false,
      inviteSentAt: null,
      nudgeSentAt: null,
      reminderSentAt: null,
      respondedAt: now,
      createdAt: now,
    };
    await db.insert(guests).values(guest);
  }

  if (!viewer.name) {
    await db.update(schema.users).set({ name: input.name }).where(eq(schema.users.id, viewer.id));
  }

  if (event.pollOpen) await replaceVotes(event.id, guest.id, input.pollOptionIds);

  const changed = !existing || existing.status !== status || existing.plusOnes !== plusOnes;
  if (changed) {
    try {
      const base = await getBaseUrl();
      await sendRsvpConfirmation(event, guest, base);
      await notifyHostOfRsvp(event, guest, base);
      // Someone dropping out may free a seat for the waitlist.
      for (const g of await promoteWaitlist(event)) {
        await sendRsvpConfirmation(event, g, base, "A spot opened up. You’re in");
      }
    } catch (e) {
      // The reply is saved; a notification problem must not fail it.
      console.error("[rsvp] notification failed", e);
    }
  }

  refresh();
  return ok({ status });
}

/** Lets a guest who already replied change their date-poll votes. */
export async function setPollVotes(eventId: string, optionIds: string[]): Promise<ActionResult> {
  if (!(await allowAction("poll", 40))) return fail(SLOW_DOWN);
  const viewer = await getViewer();
  const guest = viewer ? await findGuestForUser(eventId, viewer.id) : null;
  if (!guest) return fail("Reply to the invite first so the host knows who’s voting.");
  const event = await getEventById(eventId);
  if (!event?.pollOpen) return fail("Voting has closed.");
  await replaceVotes(eventId, guest.id, optionIds.slice(0, 6));
  refresh();
  return ok();
}
