import { getEventBySlug } from "@/lib/data";
import { buildIcs } from "@/lib/ics";
import { requestOrigin } from "@/lib/request";

export async function GET(_request: Request, ctx: RouteContext<"/e/[slug]/calendar.ics">) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);
  if (!event || !event.startsAt) return new Response("Not found", { status: 404 });
  const base = await requestOrigin();
  const ics = buildIcs({
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: [event.locationName, event.locationAddress].filter(Boolean).join(", ") || event.onlineUrl,
    url: `${base}/e/${event.slug}`,
    cancelled: event.status === "cancelled",
    updatedAt: event.updatedAt,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
