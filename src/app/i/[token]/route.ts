import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { findGuestForUser, getEventById } from "@/lib/data";
import { ensureViewer } from "@/lib/session";

const { guests, pollVotes, bringClaims, posts } = schema;

/**
 * Personal invite link. Holding the token is the proof of identity: it ties
 * the guest record to this browser, then sends the guest to the clean event
 * URL so the secret never sits in an address bar that might get shared.
 */
export async function GET(_request: Request, ctx: RouteContext<"/i/[token]">) {
  const { token } = await ctx.params;
  const guest = (await db.select().from(guests).where(eq(guests.token, token)).limit(1))[0];
  if (!guest) redirect("/gone");
  const event = await getEventById(guest.eventId);
  if (!event) redirect("/gone");

  const viewer = await ensureViewer(guest.name);
  if (guest.userId !== viewer.id && event.hostId !== viewer.id) {
    // This browser may already have replied through the public link. Keep one
    // record per person: carry that reply over to the invited record.
    const earlier = await findGuestForUser(event.id, viewer.id);
    if (earlier && earlier.id !== guest.id) {
      if (guest.status === "invited" && earlier.status !== "invited") {
        await db
          .update(guests)
          .set({
            name: earlier.name,
            status: earlier.status,
            plusOnes: earlier.plusOnes,
            note: earlier.note,
            respondedAt: earlier.respondedAt,
          })
          .where(eq(guests.id, guest.id));
        await db.update(pollVotes).set({ guestId: guest.id }).where(eq(pollVotes.guestId, earlier.id));
        await db.update(bringClaims).set({ guestId: guest.id }).where(eq(bringClaims.guestId, earlier.id));
        await db.update(posts).set({ guestId: guest.id }).where(eq(posts.guestId, earlier.id));
        await db.delete(guests).where(eq(guests.id, earlier.id));
      } else {
        await db.update(guests).set({ userId: null }).where(eq(guests.id, earlier.id));
      }
    }
    await db.update(guests).set({ userId: viewer.id }).where(eq(guests.id, guest.id));
  }
  redirect(`/e/${event.slug}`);
}
