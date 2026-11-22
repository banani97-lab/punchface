import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { EventEditor, type EditorState } from "@/components/editor/event-editor";
import { db, schema } from "@/db";
import { aiConfigured } from "@/lib/ai";
import { getEventBySlug } from "@/lib/data";
import { getViewer } from "@/lib/session";
import { imageUrl } from "@/lib/storage";
import { utcToZonedInput } from "@/lib/time";

export const metadata: Metadata = { title: "Edit invite", robots: { index: false } };

export default function EditEventPage({ params }: PageProps<"/e/[slug]/edit">) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6"><div className="skeleton h-12 w-64" /></div>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: Pick<PageProps<"/e/[slug]/edit">, "params">) {
  const { slug } = await params;
  const [event, viewer] = await Promise.all([getEventBySlug(slug), getViewer()]);
  // Same response for "missing" and "not yours", so slugs can’t be probed.
  if (!event || !viewer || viewer.id !== event.hostId) notFound();

  const [options, items] = await Promise.all([
    db.select().from(schema.pollOptions).where(eq(schema.pollOptions.eventId, event.id)).orderBy(asc(schema.pollOptions.startsAt)),
    db.select().from(schema.bringItems).where(eq(schema.bringItems.eventId, event.id)).orderBy(asc(schema.bringItems.position)),
  ]);

  const tz = event.timezone;
  const initial: EditorState = {
    title: event.title,
    hostName: event.hostName,
    description: event.description,
    emoji: event.emoji,
    themeId: event.themeId,
    dateMode: event.pollOpen ? "poll" : "set",
    startsAtLocal: event.startsAt ? utcToZonedInput(event.startsAt, tz) : "",
    endsAtLocal: event.endsAt ? utcToZonedInput(event.endsAt, tz) : "",
    pollOptionsLocal: options.map((o) => utcToZonedInput(o.startsAt, tz)),
    timezone: tz,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    onlineUrl: event.onlineUrl,
    allowPlusOnes: event.allowPlusOnes,
    maxPlusOnes: event.maxPlusOnes,
    capacity: event.capacity,
    guestListVisibility: event.guestListVisibility,
    wallEnabled: event.wallEnabled,
    photosEnabled: event.photosEnabled,
    bringEnabled: event.bringEnabled,
    bringItems: items.map((i) => ({ id: i.id, label: i.label, quantity: i.quantity })),
    notifyHost: event.notifyHost,
  };

  return (
    <EventEditor
      mode="edit"
      eventId={event.id}
      slug={event.slug}
      initial={initial}
      coverUrl={event.coverKey ? imageUrl(event.coverKey) : null}
      aiEnabled={aiConfigured()}
    />
  );
}
