import { timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNotNull, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendNudge, sendReminder } from "@/lib/notify";
import { getBaseUrl } from "@/lib/request";

const { events, guests } = schema;
const HOUR = 3600_000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Automatic reminders. Call hourly from any scheduler with
 * `Authorization: Bearer $CRON_SECRET`:
 *  - guests who are going or maybe get a reminder within 24h of the start
 *  - invited guests who haven’t replied get one nudge 2 to 4 days before
 */
export async function POST(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const now = Date.now();
  const base = await getBaseUrl();
  let reminders = 0;
  let nudges = 0;

  const upcoming = await db
    .select()
    .from(events)
    .where(and(eq(events.status, "active"), isNotNull(events.startsAt), gt(events.startsAt, now), lt(events.startsAt, now + 96 * HOUR)));

  for (const event of upcoming) {
    const list = await db.select().from(guests).where(eq(guests.eventId, event.id));
    const untilStart = event.startsAt! - now;
    for (const g of list) {
      if (untilStart <= 24 * HOUR && (g.status === "going" || g.status === "maybe") && !g.reminderSentAt) {
        if (await sendReminder(event, g, base)) reminders += 1;
      } else if (untilStart > 48 * HOUR && g.status === "invited" && g.inviteSentAt && !g.nudgeSentAt) {
        if (await sendNudge(event, g, base)) nudges += 1;
      }
    }
  }
  return Response.json({ ok: true, events: upcoming.length, reminders, nudges });
}
