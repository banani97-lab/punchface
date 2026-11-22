import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getEventById } from "@/lib/data";

/** One-click "stop emailing me about this event" link from email footers. */
export async function GET(_request: Request, ctx: RouteContext<"/i/[token]/stop">) {
  const { token } = await ctx.params;
  const guest = (await db.select().from(schema.guests).where(eq(schema.guests.token, token)).limit(1))[0];
  if (!guest) redirect("/");
  await db.update(schema.guests).set({ emailOptOut: true }).where(eq(schema.guests.id, guest.id));
  const event = await getEventById(guest.eventId);
  redirect(event ? `/e/${event.slug}?emails=off` : "/");
}
