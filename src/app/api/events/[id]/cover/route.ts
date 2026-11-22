import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireHost } from "@/lib/access";
import { allowAction } from "@/lib/request";
import { deleteImage } from "@/lib/storage";
import { receiveImage } from "@/lib/upload";

/** Replaces the event’s cover with an uploaded photo. Host only. */
export async function POST(request: Request, ctx: RouteContext<"/api/events/[id]/cover">) {
  const { id } = await ctx.params;
  if (!(await allowAction("cover", 12, 5 * 60_000))) {
    return Response.json({ error: "Too many uploads. Give it a few minutes." }, { status: 429 });
  }
  const access = await requireHost(id);
  if (!access) return Response.json({ error: "Only the host can change the cover." }, { status: 403 });

  const upload = await receiveImage(request);
  if (!upload.ok) return Response.json({ error: upload.error }, { status: upload.status });

  await db
    .update(schema.events)
    .set({ coverKey: upload.image.key, updatedAt: Date.now() })
    .where(eq(schema.events.id, id));
  if (access.event.coverKey) await deleteImage(access.event.coverKey);
  return Response.json({ ok: true, key: upload.image.key });
}
