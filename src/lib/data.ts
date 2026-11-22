import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Event, Guest, GuestStatus } from "@/db/schema";
import type { Viewer } from "./session";

const { events, guests, pollOptions, pollVotes, bringItems, bringClaims, posts, reactions, photos } = schema;

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const rows = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getEventById(id: string): Promise<Event | null> {
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findGuestForUser(eventId: string, userId: string): Promise<Guest | null> {
  const rows = await db
    .select()
    .from(guests)
    .where(and(eq(guests.eventId, eventId), eq(guests.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export type Counts = {
  going: number;
  /** Going guests plus the people they’re bringing. */
  heads: number;
  maybe: number;
  declined: number;
  invited: number;
  waitlist: number;
};

export function countGuests(list: Array<Pick<Guest, "status" | "plusOnes">>): Counts {
  const c: Counts = { going: 0, heads: 0, maybe: 0, declined: 0, invited: 0, waitlist: 0 };
  for (const g of list) {
    c[g.status] += 1;
    if (g.status === "going") c.heads += 1 + g.plusOnes;
  }
  return c;
}

export type GuestSummary = {
  id: string;
  name: string;
  status: GuestStatus;
  plusOnes: number;
  note: string;
};

export type PollOptionView = {
  id: string;
  startsAt: number;
  votes: number;
  voters: string[];
  mine: boolean;
};

export type BringItemView = {
  id: string;
  label: string;
  quantity: number;
  claimed: number;
  claims: Array<{ name: string; quantity: number; mine: boolean }>;
  mine: number;
};

export type PostView = {
  id: string;
  authorName: string;
  isHost: boolean;
  kind: "comment" | "update";
  body: string;
  createdAt: number;
  reactions: Array<{ emoji: string; count: number; mine: boolean }>;
  canDelete: boolean;
};

export type PhotoView = {
  id: string;
  key: string;
  width: number;
  height: number;
  authorName: string;
  canDelete: boolean;
};

export type EventView = {
  event: Event;
  isHost: boolean;
  me: Guest | null;
  /** Host, or anyone with a guest record: allowed to post, claim and upload. */
  canParticipate: boolean;
  counts: Counts;
  canSeeGuests: boolean;
  /** Empty unless `canSeeGuests`. Notes are only included for the host. */
  guests: GuestSummary[];
  /** A few first names for the "who’s coming" teaser, even when the list is hidden. */
  faces: string[];
  poll: PollOptionView[];
  bring: BringItemView[];
  posts: PostView[];
  photos: PhotoView[];
  /**
   * Guest comments and photos follow the guest-list setting: unless the list
   * is open to everyone, they are held back until the viewer has a guest
   * record. These count what was withheld. Host updates are always shown.
   */
  hiddenPosts: number;
  hiddenPhotos: number;
};

const STATUS_ORDER: Record<GuestStatus, number> = { going: 0, maybe: 1, waitlist: 2, invited: 3, declined: 4 };

/** Everything the public event page shows, shaped for one viewer. */
export async function loadEventView(event: Event, viewer: Viewer | null): Promise<EventView> {
  const isHost = Boolean(viewer && viewer.id === event.hostId);

  const [guestRows, optionRows, itemRows, postRows, photoRows] = await Promise.all([
    db.select().from(guests).where(eq(guests.eventId, event.id)).orderBy(asc(guests.createdAt)),
    db.select().from(pollOptions).where(eq(pollOptions.eventId, event.id)).orderBy(asc(pollOptions.startsAt)),
    db.select().from(bringItems).where(eq(bringItems.eventId, event.id)).orderBy(asc(bringItems.position)),
    db.select().from(posts).where(eq(posts.eventId, event.id)).orderBy(desc(posts.createdAt)).limit(100),
    db.select().from(photos).where(eq(photos.eventId, event.id)).orderBy(desc(photos.createdAt)).limit(120),
  ]);

  const me = viewer ? (guestRows.find((g) => g.userId === viewer.id) ?? null) : null;
  const responded = Boolean(me && me.status !== "invited");
  const canSeeGuests =
    isHost ||
    event.guestListVisibility === "everyone" ||
    (event.guestListVisibility === "guests" && responded);
  const canSeeActivity = isHost || Boolean(me) || event.guestListVisibility === "everyone";
  const nameById = new Map(guestRows.map((g) => [g.id, g.name]));

  const [voteRows, claimRows, reactionRows] = await Promise.all([
    optionRows.length
      ? db.select().from(pollVotes).where(inArray(pollVotes.optionId, optionRows.map((o) => o.id)))
      : [],
    itemRows.length
      ? db.select().from(bringClaims).where(inArray(bringClaims.itemId, itemRows.map((i) => i.id)))
      : [],
    postRows.length
      ? db.select().from(reactions).where(inArray(reactions.postId, postRows.map((p) => p.id)))
      : [],
  ]);

  const poll: PollOptionView[] = optionRows.map((o) => {
    const votes = voteRows.filter((v) => v.optionId === o.id);
    return {
      id: o.id,
      startsAt: o.startsAt,
      votes: votes.length,
      voters: canSeeGuests ? votes.map((v) => nameById.get(v.guestId) ?? "Guest") : [],
      mine: Boolean(me && votes.some((v) => v.guestId === me.id)),
    };
  });

  const bring: BringItemView[] = itemRows.map((item) => {
    const claims = claimRows.filter((c) => c.itemId === item.id);
    return {
      id: item.id,
      label: item.label,
      quantity: item.quantity,
      claimed: claims.reduce((n, c) => n + c.quantity, 0),
      claims: claims.map((c) => ({
        name: canSeeGuests || (me && c.guestId === me.id) ? (nameById.get(c.guestId) ?? "Guest") : "A guest",
        quantity: c.quantity,
        mine: Boolean(me && c.guestId === me.id),
      })),
      mine: claims.find((c) => me && c.guestId === me.id)?.quantity ?? 0,
    };
  });

  const visiblePosts = canSeeActivity ? postRows : postRows.filter((p) => p.kind === "update");
  const postViews: PostView[] = visiblePosts.map((p) => {
    const byEmoji = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactionRows) {
      if (r.postId !== p.id) continue;
      const entry = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (viewer && r.userId === viewer.id) entry.mine = true;
      byEmoji.set(r.emoji, entry);
    }
    return {
      id: p.id,
      authorName: p.authorName,
      isHost: p.isHost,
      kind: p.kind,
      body: p.body,
      createdAt: p.createdAt,
      reactions: [...byEmoji].map(([emoji, v]) => ({ emoji, ...v })),
      canDelete: isHost || Boolean(me && p.guestId === me.id),
    };
  });

  const sorted = [...guestRows].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return {
    event,
    isHost,
    me,
    canParticipate: isHost || Boolean(me),
    counts: countGuests(guestRows),
    canSeeGuests,
    guests: canSeeGuests
      ? sorted
          .filter((g) => isHost || g.status !== "invited")
          .map((g) => ({
            id: g.id,
            name: g.name,
            status: g.status,
            plusOnes: g.plusOnes,
            note: isHost ? g.note : "",
          }))
      : [],
    faces: guestRows.filter((g) => g.status === "going").slice(0, 6).map((g) => g.name),
    poll,
    bring,
    posts: postViews,
    hiddenPosts: postRows.length - visiblePosts.length,
    hiddenPhotos: canSeeActivity ? 0 : photoRows.length,
    photos: (canSeeActivity ? photoRows : []).map((p) => ({
      id: p.id,
      key: p.key,
      width: p.width,
      height: p.height,
      authorName: p.authorName,
      canDelete: isHost || Boolean(viewer && p.userId === viewer.id),
    })),
  };
}

export type EventCard = {
  event: Event;
  counts: Counts;
  myStatus: GuestStatus | null;
};

/** Events the viewer hosts and events they’ve been invited or replied to. */
export async function listEventsForUser(userId: string): Promise<{ hosting: EventCard[]; attending: EventCard[] }> {
  const [hosted, mine] = await Promise.all([
    db.select().from(events).where(eq(events.hostId, userId)).orderBy(desc(events.createdAt)),
    db
      .select({ event: events, status: guests.status })
      .from(guests)
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(eq(guests.userId, userId))
      .orderBy(desc(guests.createdAt)),
  ]);

  const ids = [...new Set([...hosted.map((e) => e.id), ...mine.map((m) => m.event.id)])];
  const rows = ids.length
    ? await db
        .select({
          eventId: guests.eventId,
          status: guests.status,
          n: sql<number>`count(*)`,
          plus: sql<number>`coalesce(sum(${guests.plusOnes}), 0)`,
        })
        .from(guests)
        .where(inArray(guests.eventId, ids))
        .groupBy(guests.eventId, guests.status)
    : [];

  const countsFor = (eventId: string): Counts => {
    const c: Counts = { going: 0, heads: 0, maybe: 0, declined: 0, invited: 0, waitlist: 0 };
    for (const r of rows) {
      if (r.eventId !== eventId) continue;
      c[r.status] = Number(r.n);
      if (r.status === "going") c.heads = Number(r.n) + Number(r.plus);
    }
    return c;
  };

  const hostedIds = new Set(hosted.map((e) => e.id));
  return {
    hosting: hosted.map((event) => ({ event, counts: countsFor(event.id), myStatus: null })),
    attending: mine
      .filter((m) => !hostedIds.has(m.event.id))
      .map((m) => ({ event: m.event, counts: countsFor(m.event.id), myStatus: m.status })),
  };
}

/** Seats used by guests who are going, optionally ignoring one guest. */
export async function seatsTaken(eventId: string, exceptGuestId?: string): Promise<number> {
  const rows = await db
    .select({ id: guests.id, plusOnes: guests.plusOnes })
    .from(guests)
    .where(and(eq(guests.eventId, eventId), eq(guests.status, "going")));
  return rows.filter((g) => g.id !== exceptGuestId).reduce((n, g) => n + 1 + g.plusOnes, 0);
}

/**
 * Moves waitlisted guests into free seats, oldest reply first.
 * Returns the guests who got in so the caller can tell them.
 */
export async function promoteWaitlist(event: Event): Promise<Guest[]> {
  if (!event.capacity) return [];
  const waiting = await db
    .select()
    .from(guests)
    .where(and(eq(guests.eventId, event.id), eq(guests.status, "waitlist")))
    .orderBy(asc(guests.respondedAt));
  if (waiting.length === 0) return [];
  let taken = await seatsTaken(event.id);
  const promoted: Guest[] = [];
  for (const g of waiting) {
    const heads = 1 + g.plusOnes;
    if (taken + heads > event.capacity) continue;
    await db.update(guests).set({ status: "going" }).where(eq(guests.id, g.id));
    taken += heads;
    promoted.push({ ...g, status: "going" });
  }
  return promoted;
}
