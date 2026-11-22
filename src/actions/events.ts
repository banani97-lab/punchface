"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { NOT_ALLOWED, SLOW_DOWN, requireHost } from "@/lib/access";
import { promoteWaitlist } from "@/lib/data";
import { newEventSlug, newId } from "@/lib/ids";
import { sendCancellation, sendRsvpConfirmation, sendUpdateToGuests } from "@/lib/notify";
import { allowAction, getBaseUrl } from "@/lib/request";
import { ensureViewer } from "@/lib/session";
import { deleteImage } from "@/lib/storage";
import { formatWhen, zonedToUtc } from "@/lib/time";
import { fail, ok, type ActionResult } from "@/lib/utils";
import { eventInput, fieldErrors } from "@/lib/validation";

const { events, guests, pollOptions, bringItems, photos } = schema;

type BringItemInput = { id?: string; label: string; quantity: number };

export type SaveEventPayload = Record<string, unknown> & { bringItems?: BringItemInput[] };

/** Creates an event, or updates it when `eventId` is given. */
export async function saveEvent(
  eventId: string | null,
  payload: SaveEventPayload,
): Promise<ActionResult<{ slug: string; id: string }>> {
  if (!(await allowAction("save-event", 30))) return fail(SLOW_DOWN);

  const parsed = eventInput.safeParse(payload);
  if (!parsed.success) {
    return fail("A couple of things need fixing before this can go out.", fieldErrors(parsed.error));
  }
  const input = parsed.data;
  const now = Date.now();

  let startsAt: number | null = null;
  let endsAt: number | null = null;
  let pollTimes: number[] = [];
  if (input.dateMode === "set") {
    startsAt = zonedToUtc(input.startsAtLocal, input.timezone);
    endsAt = input.endsAtLocal ? zonedToUtc(input.endsAtLocal, input.timezone) : null;
    if (!startsAt) return fail("Pick a date and time.", { startsAtLocal: "Pick a date and time" });
  } else {
    pollTimes = [...new Set(input.pollOptionsLocal)]
      .map((v) => zonedToUtc(v, input.timezone))
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
  }

  const values = {
    title: input.title,
    hostName: input.hostName,
    description: input.description,
    emoji: input.emoji,
    themeId: input.themeId,
    startsAt,
    endsAt,
    timezone: input.timezone,
    locationName: input.locationName,
    locationAddress: input.locationAddress,
    onlineUrl: input.onlineUrl,
    allowPlusOnes: input.allowPlusOnes,
    maxPlusOnes: input.maxPlusOnes,
    capacity: input.capacity,
    guestListVisibility: input.guestListVisibility,
    wallEnabled: input.wallEnabled,
    photosEnabled: input.photosEnabled,
    bringEnabled: input.bringEnabled,
    pollOpen: input.dateMode === "poll",
    notifyHost: input.notifyHost,
    updatedAt: now,
  };

  let id: string;
  let slug: string;

  if (eventId) {
    const access = await requireHost(eventId);
    if (!access) return fail(NOT_ALLOWED);
    id = access.event.id;
    slug = access.event.slug;
    await db.update(events).set(values).where(eq(events.id, id));
  } else {
    const viewer = await ensureViewer(input.hostName);
    id = newId();
    slug = newEventSlug(input.title);
    await db.insert(events).values({ id, slug, hostId: viewer.id, createdAt: now, ...values });
    if (!viewer.name) {
      await db.update(schema.users).set({ name: input.hostName }).where(eq(schema.users.id, viewer.id));
    }
  }

  // Poll options: keep rows whose time is unchanged so existing votes survive.
  const existingOptions = await db.select().from(pollOptions).where(eq(pollOptions.eventId, id));
  const keep = new Set(pollTimes);
  const stale = existingOptions.filter((o) => !keep.has(o.startsAt)).map((o) => o.id);
  if (stale.length) await db.delete(pollOptions).where(inArray(pollOptions.id, stale));
  const have = new Set(existingOptions.map((o) => o.startsAt));
  const fresh = pollTimes.filter((t) => !have.has(t));
  if (fresh.length) {
    await db.insert(pollOptions).values(fresh.map((t, i) => ({ id: newId(), eventId: id, startsAt: t, position: i })));
  }

  // Bring list: update by id, insert new rows, drop rows the host removed.
  const submitted = (payload.bringItems ?? []).filter((i) => i.label?.trim());
  const existingItems = await db.select().from(bringItems).where(eq(bringItems.eventId, id));
  const existingIds = new Set(existingItems.map((i) => i.id));
  const keptIds = new Set(submitted.map((i) => i.id).filter((v): v is string => Boolean(v && existingIds.has(v))));
  const removed = existingItems.filter((i) => !keptIds.has(i.id)).map((i) => i.id);
  if (removed.length) await db.delete(bringItems).where(inArray(bringItems.id, removed));
  for (const [position, item] of input.bringItems.entries()) {
    const sourceId = submitted[position]?.id;
    if (sourceId && existingIds.has(sourceId)) {
      await db
        .update(bringItems)
        .set({ label: item.label, quantity: item.quantity, position })
        .where(and(eq(bringItems.id, sourceId), eq(bringItems.eventId, id)));
    } else {
      await db.insert(bringItems).values({ id: newId(), eventId: id, label: item.label, quantity: item.quantity, position });
    }
  }

  if (eventId) {
    // A larger capacity may free seats for people on the waitlist.
    const updated = { ...(await requireHost(id))!.event };
    const promoted = await promoteWaitlist(updated);
    if (promoted.length) {
      const base = await getBaseUrl();
      for (const g of promoted) await sendRsvpConfirmation(updated, g, base, "A spot opened up. You’re in");
    }
  }

  return ok({ slug, id });
}

/** Closes the date poll and fixes the event to the chosen option. */
export async function lockPollDate(eventId: string, optionId: string, notify: boolean): Promise<ActionResult> {
  const access = await requireHost(eventId);
  if (!access) return fail(NOT_ALLOWED);
  const option = (
    await db
      .select()
      .from(pollOptions)
      .where(and(eq(pollOptions.id, optionId), eq(pollOptions.eventId, eventId)))
      .limit(1)
  )[0];
  if (!option) return fail("That date option no longer exists.");

  await db
    .update(events)
    .set({ startsAt: option.startsAt, endsAt: null, pollOpen: false, updatedAt: Date.now() })
    .where(eq(events.id, eventId));

  if (notify) {
    const event = { ...access.event, startsAt: option.startsAt, endsAt: null, pollOpen: false };
    const list = await db.select().from(guests).where(eq(guests.eventId, eventId));
    const when = formatWhen(event.startsAt, null, event.timezone);
    await sendUpdateToGuests(event, list, `The date is set: ${when}. Let me know if you can make it!`, await getBaseUrl());
  }
  return ok(undefined, "Date locked in.");
}

export async function setEventCancelled(eventId: string, cancelled: boolean): Promise<ActionResult> {
  const access = await requireHost(eventId);
  if (!access) return fail(NOT_ALLOWED);
  await db
    .update(events)
    .set({ status: cancelled ? "cancelled" : "active", updatedAt: Date.now() })
    .where(eq(events.id, eventId));
  if (cancelled) {
    const list = await db.select().from(guests).where(eq(guests.eventId, eventId));
    const sent = await sendCancellation(access.event, list, await getBaseUrl());
    return ok(undefined, sent ? `Event cancelled. ${sent} guest${sent === 1 ? "" : "s"} emailed.` : "Event cancelled.");
  }
  return ok(undefined, "Event restored.");
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const access = await requireHost(eventId);
  if (!access) return fail(NOT_ALLOWED);
  const images = await db.select({ key: photos.key }).from(photos).where(eq(photos.eventId, eventId));
  await db.delete(events).where(eq(events.id, eventId));
  await Promise.all([
    ...images.map((p) => deleteImage(p.key)),
    access.event.coverKey ? deleteImage(access.event.coverKey) : Promise.resolve(),
  ]);
  redirect("/events");
}

export async function removeCover(eventId: string): Promise<ActionResult> {
  const access = await requireHost(eventId);
  if (!access) return fail(NOT_ALLOWED);
  if (access.event.coverKey) await deleteImage(access.event.coverKey);
  await db.update(events).set({ coverKey: null, updatedAt: Date.now() }).where(eq(events.id, eventId));
  return ok();
}
