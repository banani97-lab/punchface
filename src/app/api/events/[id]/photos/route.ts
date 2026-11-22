import { db, schema } from "@/db";
import { requireParticipant } from "@/lib/access";
import { newId } from "@/lib/ids";
import { allowAction } from "@/lib/request";
import { receiveImage } from "@/lib/upload";

/** Adds a photo to an event’s shared album. Guests and the host only. */
export async function POST(request: Request, ctx: RouteContext<"/api/events/[id]/photos">) {
  const { id } = await ctx.params;
  if (!(await allowAction("photo", 40, 5 * 60_000))) {
    return Response.json({ error: "That’s a lot of photos at once. Give it a few minutes." }, { status: 429 });
  }
  const who = await requireParticipant(id);
  if (!who) return Response.json({ error: "Reply to the invite first, then add photos." }, { status: 403 });
  if (!who.event.photosEnabled) return Response.json({ error: "The host turned the album off." }, { status: 403 });

  const upload = await receiveImage(request);
  if (!upload.ok) return Response.json({ error: upload.error }, { status: upload.status });

  await db.insert(schema.photos).values({
    id: newId(),
    eventId: id,
    userId: who.viewer.id,
    authorName: who.displayName,
    key: upload.image.key,
    width: upload.image.width,
    height: upload.image.height,
    createdAt: Date.now(),
  });
  return Response.json({ ok: true });
}
