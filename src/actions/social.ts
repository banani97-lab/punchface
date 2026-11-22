"use server";

import { refresh } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { NOT_ALLOWED, SLOW_DOWN, requireParticipant } from "@/lib/access";
import { REACTION_EMOJI } from "@/lib/constants";
import { newId } from "@/lib/ids";
import { allowAction } from "@/lib/request";
import { getViewer } from "@/lib/session";
import { deleteImage } from "@/lib/storage";
import { fail, ok, type ActionResult } from "@/lib/utils";

const { posts, reactions, bringItems, bringClaims, photos } = schema;

const REPLY_FIRST = "Reply to the invite first, then join in.";

export async function addPost(eventId: string, body: string): Promise<ActionResult> {
  if (!(await allowAction("post", 12))) return fail(SLOW_DOWN);
  const text = body.trim();
  if (!text) return fail("Write something first.");
  if (text.length > 1000) return fail("Keep it under 1,000 characters.");
  const who = await requireParticipant(eventId);
  if (!who) return fail(REPLY_FIRST);
  if (!who.event.wallEnabled) return fail("The host turned comments off.");

  await db.insert(posts).values({
    id: newId(),
    eventId,
    guestId: who.isHost ? null : who.guest!.id,
    authorName: who.displayName,
    isHost: who.isHost,
    kind: "comment",
    body: text,
    createdAt: Date.now(),
  });
  refresh();
  return ok();
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const post = (await db.select().from(posts).where(eq(posts.id, postId)).limit(1))[0];
  if (!post) return ok();
  const who = await requireParticipant(post.eventId);
  if (!who) return fail(NOT_ALLOWED);
  const mine = Boolean(who.guest && post.guestId === who.guest.id);
  if (!who.isHost && !mine) return fail(NOT_ALLOWED);
  await db.delete(posts).where(eq(posts.id, postId));
  refresh();
  return ok();
}

export async function toggleReaction(postId: string, emoji: string): Promise<ActionResult> {
  if (!(await allowAction("react", 60))) return fail(SLOW_DOWN);
  if (!(REACTION_EMOJI as readonly string[]).includes(emoji)) return fail("Unknown reaction.");
  const post = (await db.select().from(posts).where(eq(posts.id, postId)).limit(1))[0];
  if (!post) return fail("That post is gone.");
  const who = await requireParticipant(post.eventId);
  if (!who) return fail(REPLY_FIRST);

  const where = and(eq(reactions.postId, postId), eq(reactions.userId, who.viewer.id), eq(reactions.emoji, emoji));
  const existing = await db.select().from(reactions).where(where).limit(1);
  if (existing.length) await db.delete(reactions).where(where);
  else await db.insert(reactions).values({ postId, userId: who.viewer.id, emoji });
  refresh();
  return ok();
}

/** Sets how many of an item the viewer will bring; zero removes their claim. */
export async function claimItem(itemId: string, quantity: number): Promise<ActionResult> {
  if (!(await allowAction("claim", 60))) return fail(SLOW_DOWN);
  const item = (await db.select().from(bringItems).where(eq(bringItems.id, itemId)).limit(1))[0];
  if (!item) return fail("That item was removed.");
  const who = await requireParticipant(item.eventId);
  if (!who?.guest) {
    return fail(who?.isHost ? "You’re the host: edit the list from the event editor." : REPLY_FIRST);
  }
  const guestId = who.guest.id;
  const qty = Math.max(0, Math.min(Math.floor(quantity) || 0, 99));

  if (qty === 0) {
    await db.delete(bringClaims).where(and(eq(bringClaims.itemId, itemId), eq(bringClaims.guestId, guestId)));
    // An item a guest added themselves disappears once nobody is bringing it.
    if (item.addedByGuestId) {
      const left = await db.select().from(bringClaims).where(eq(bringClaims.itemId, itemId)).limit(1);
      if (left.length === 0) await db.delete(bringItems).where(eq(bringItems.id, itemId));
    }
  } else {
    const others = await db
      .select({ n: sql<number>`coalesce(sum(${bringClaims.quantity}), 0)` })
      .from(bringClaims)
      .where(and(eq(bringClaims.itemId, itemId), sql`${bringClaims.guestId} != ${guestId}`));
    const free = item.quantity - Number(others[0]?.n ?? 0);
    if (free <= 0) return fail("Someone just grabbed the last one.");
    await db
      .insert(bringClaims)
      .values({ itemId, guestId, quantity: Math.min(qty, free) })
      .onConflictDoUpdate({
        target: [bringClaims.itemId, bringClaims.guestId],
        set: { quantity: Math.min(qty, free) },
      });
  }
  refresh();
  return ok();
}

/** "I’ll bring something else": adds an item already claimed by the guest. */
export async function bringSomethingElse(eventId: string, label: string): Promise<ActionResult> {
  if (!(await allowAction("bring-add", 10))) return fail(SLOW_DOWN);
  const text = label.trim().slice(0, 80);
  if (!text) return fail("What are you bringing?");
  const who = await requireParticipant(eventId);
  if (!who?.guest) return fail(REPLY_FIRST);
  if (!who.event.bringEnabled) return fail("The host turned the bring list off.");

  const id = newId();
  const last = await db
    .select({ p: sql<number>`coalesce(max(${bringItems.position}), 0)` })
    .from(bringItems)
    .where(eq(bringItems.eventId, eventId));
  await db.insert(bringItems).values({
    id,
    eventId,
    label: text,
    quantity: 1,
    position: Number(last[0]?.p ?? 0) + 1,
    addedByGuestId: who.guest.id,
  });
  await db.insert(bringClaims).values({ itemId: id, guestId: who.guest.id, quantity: 1 });
  refresh();
  return ok();
}

export async function deletePhoto(photoId: string): Promise<ActionResult> {
  const photo = (await db.select().from(photos).where(eq(photos.id, photoId)).limit(1))[0];
  if (!photo) return ok();
  const viewer = await getViewer();
  const who = await requireParticipant(photo.eventId);
  if (!viewer || !who) return fail(NOT_ALLOWED);
  if (!who.isHost && photo.userId !== viewer.id) return fail(NOT_ALLOWED);
  await db.delete(photos).where(eq(photos.id, photoId));
  await deleteImage(photo.key);
  refresh();
  return ok();
}
