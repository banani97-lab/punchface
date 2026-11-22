import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getEventBySlug } from "@/lib/data";
import { STATUS_LABEL } from "@/lib/constants";
import { getViewer } from "@/lib/session";

// Quote every cell, and defuse cells a spreadsheet would run as a formula.
const cell = (value: string | number) => {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** Guest list export for the host. */
export async function GET(_request: Request, ctx: RouteContext<"/e/[slug]/guests.csv">) {
  const { slug } = await ctx.params;
  const [event, viewer] = await Promise.all([getEventBySlug(slug), getViewer()]);
  if (!event || !viewer || viewer.id !== event.hostId) return new Response("Not found", { status: 404 });

  const rows = await db
    .select()
    .from(schema.guests)
    .where(eq(schema.guests.eventId, event.id))
    .orderBy(asc(schema.guests.createdAt));
  const lines = [
    ["Name", "Email", "Reply", "Plus ones", "Headcount", "Note", "Replied at (UTC)"].map(cell).join(","),
    ...rows.map((g) =>
      [
        g.name,
        g.email ?? "",
        STATUS_LABEL[g.status],
        g.plusOnes,
        g.status === "going" ? 1 + g.plusOnes : 0,
        g.note,
        g.respondedAt ? new Date(g.respondedAt).toISOString() : "",
      ]
        .map(cell)
        .join(","),
    ),
  ];
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-guests.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
