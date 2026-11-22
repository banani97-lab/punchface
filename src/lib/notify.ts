import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Event, Guest } from "@/db/schema";
import { sendEmail, templates } from "./email";
import { formatWhen } from "./time";

/** Outbound notifications. Each takes `base`, the absolute origin for links. */

export function eventFacts(event: Event) {
  const where = event.locationName || event.locationAddress || (event.onlineUrl ? "Online" : "");
  return {
    title: event.title,
    emoji: event.emoji,
    hostName: event.hostName,
    when: formatWhen(event.startsAt, event.endsAt, event.timezone),
    where,
  };
}

export const inviteLink = (base: string, guest: Pick<Guest, "token">) => `${base}/i/${guest.token}`;
export const optOutLink = (base: string, guest: Pick<Guest, "token">) => `${base}/i/${guest.token}/stop`;

const reachable = (g: Guest): g is Guest & { email: string } => Boolean(g.email) && !g.emailOptOut;

async function hostEmail(event: Event): Promise<string | undefined> {
  const rows = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, event.hostId))
    .limit(1);
  return rows[0]?.email ?? undefined;
}

export async function sendInvite(event: Event, guest: Guest, base: string): Promise<boolean> {
  if (!reachable(guest)) return false;
  const t = templates.invite(eventFacts(event), guest.name, inviteLink(base, guest), optOutLink(base, guest));
  await sendEmail({ to: guest.email, ...t, kind: "invite", eventId: event.id, replyTo: await hostEmail(event) });
  await db.update(schema.guests).set({ inviteSentAt: Date.now() }).where(eq(schema.guests.id, guest.id));
  return true;
}

export async function sendNudge(event: Event, guest: Guest, base: string): Promise<boolean> {
  if (!reachable(guest)) return false;
  const t = templates.nudge(eventFacts(event), guest.name, inviteLink(base, guest), optOutLink(base, guest));
  await sendEmail({ to: guest.email, ...t, kind: "nudge", eventId: event.id, replyTo: await hostEmail(event) });
  await db.update(schema.guests).set({ nudgeSentAt: Date.now() }).where(eq(schema.guests.id, guest.id));
  return true;
}

export async function sendReminder(event: Event, guest: Guest, base: string): Promise<boolean> {
  if (!reachable(guest)) return false;
  const t = templates.reminder(eventFacts(event), guest.name, inviteLink(base, guest), optOutLink(base, guest));
  await sendEmail({ to: guest.email, ...t, kind: "reminder", eventId: event.id });
  await db.update(schema.guests).set({ reminderSentAt: Date.now() }).where(eq(schema.guests.id, guest.id));
  return true;
}

export const STATUS_LINES = {
  going: "You’re going",
  maybe: "You’re a maybe",
  declined: "You can’t make it",
  waitlist: "You’re on the waitlist",
  invited: "You’re invited",
} as const;

export async function sendRsvpConfirmation(event: Event, guest: Guest, base: string, statusLine?: string) {
  if (!reachable(guest)) return;
  const t = templates.rsvpConfirmation(
    eventFacts(event),
    guest.name,
    statusLine ?? STATUS_LINES[guest.status],
    inviteLink(base, guest),
    optOutLink(base, guest),
  );
  await sendEmail({ to: guest.email, ...t, kind: "rsvp", eventId: event.id });
}

const HOST_LINES = {
  going: "is going",
  maybe: "might come",
  declined: "can’t make it",
  waitlist: "joined the waitlist",
  invited: "was invited",
} as const;

export async function notifyHostOfRsvp(event: Event, guest: Guest, base: string) {
  if (!event.notifyHost) return;
  const to = await hostEmail(event);
  if (!to) return;
  const plus = guest.status === "going" && guest.plusOnes > 0 ? ` (+${guest.plusOnes})` : "";
  const t = templates.hostRsvp(
    eventFacts(event),
    guest.name,
    HOST_LINES[guest.status] + plus,
    guest.note,
    `${base}/e/${event.slug}/manage?tab=guests`,
  );
  await sendEmail({ to, ...t, kind: "host-rsvp", eventId: event.id });
}

/** Emails everyone who hasn’t declined. Returns how many messages went out. */
export async function sendUpdateToGuests(event: Event, guests: Guest[], message: string, base: string) {
  let sent = 0;
  for (const g of guests) {
    if (!reachable(g) || g.status === "declined") continue;
    const t = templates.update(eventFacts(event), message, inviteLink(base, g), optOutLink(base, g));
    await sendEmail({ to: g.email, ...t, kind: "update", eventId: event.id });
    sent += 1;
  }
  return sent;
}

export async function sendCancellation(event: Event, guests: Guest[], base: string) {
  let sent = 0;
  for (const g of guests) {
    if (!reachable(g) || g.status === "declined") continue;
    const t = templates.cancelled(eventFacts(event), inviteLink(base, g), optOutLink(base, g));
    await sendEmail({ to: g.email, ...t, kind: "cancelled", eventId: event.id });
    sent += 1;
  }
  return sent;
}
