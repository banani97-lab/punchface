import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, MapPin, Video } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { EventCover } from "@/components/cover/event-cover";
import { RichText } from "@/components/event/rich-text";
import { RsvpPanel, RsvpProvider, type RsvpData } from "@/components/event/rsvp";
import {
  AutoRefresh,
  BringList,
  CalendarButton,
  DatePoll,
  DismissibleNote,
  GuestList,
  LocalTimeNote,
  PhotoAlbum,
  Wall,
} from "@/components/event/sections";
import { getEventBySlug, loadEventView } from "@/lib/data";
import { googleCalendarUrl, outlookCalendarUrl } from "@/lib/ics";
import { requestNow, requestOrigin } from "@/lib/request";
import { getViewer } from "@/lib/session";
import { imageUrl } from "@/lib/storage";
import { getTheme, themeVars } from "@/lib/themes";
import { dayOfMonth, formatDay, formatTime, formatTimeRange, formatWhen, monthAbbr, relativeDay, tzAbbr } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Invite not found" };
  const when = formatWhen(event.startsAt, event.endsAt, event.timezone);
  const description = `Hosted by ${event.hostName} · ${when}${event.locationName ? ` · ${event.locationName}` : ""}`;
  return {
    title: `${event.emoji} ${event.title}`,
    description,
    // Invite pages are private by link: keep them out of search engines.
    robots: { index: false, follow: false },
    openGraph: { title: `${event.emoji} ${event.title}`, description, type: "website" },
  };
}

export default function EventPage({ params, searchParams }: PageProps<"/e/[slug]">) {
  return (
    <Suspense fallback={<EventSkeleton />}>
      <EventScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EventScreen({ params, searchParams }: Pick<PageProps<"/e/[slug]">, "params" | "searchParams">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [viewer, origin] = await Promise.all([getViewer(), requestOrigin()]);
  const view = await loadEventView(event, viewer);
  const theme = getTheme(event.themeId);
  const now = await requestNow();
  const tz = event.timezone;
  const cancelled = event.status === "cancelled";
  const past = Boolean(event.startsAt && (event.endsAt ?? event.startsAt + 6 * 3600_000) < now);
  const place = [event.locationName, event.locationAddress].filter(Boolean).join(", ");
  const path = `/e/${event.slug}`;

  const rsvp: RsvpData = {
    eventId: event.id,
    slug: event.slug,
    title: event.title,
    hostName: event.hostName,
    isHost: view.isHost,
    cancelled,
    past,
    allowPlusOnes: event.allowPlusOnes,
    maxPlusOnes: event.maxPlusOnes,
    seatsLeft: event.capacity ? Math.max(0, event.capacity - view.counts.heads) : null,
    pollOpen: event.pollOpen,
    pollOptions: view.poll.map((o) => ({
      id: o.id,
      label: `${formatDay(o.startsAt, tz)} · ${formatTime(o.startsAt, tz)}`,
      mine: o.mine,
    })),
    me: view.me
      ? {
          name: view.me.name,
          email: view.me.email ?? "",
          status: view.me.status,
          plusOnes: view.me.plusOnes,
          note: view.me.note,
        }
      : null,
    viewerName: viewer?.name ?? "",
  };

  const calendar = event.startsAt
    ? {
        id: event.id,
        title: event.title,
        description: event.description,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: place || event.onlineUrl,
        url: `${origin}${path}`,
        updatedAt: event.updatedAt,
      }
    : null;

  return (
    <div className="theme-scope min-h-dvh" style={themeVars(theme)}>
      <RsvpProvider data={rsvp}>
        <div className="mx-auto max-w-[1100px] px-4 pb-44 pt-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:pb-20 lg:pt-10">
          <aside className="lg:sticky lg:top-10 lg:self-start">
            <EventCover
              theme={theme}
              emoji={event.emoji}
              seed={event.id}
              imageUrl={event.coverKey ? imageUrl(event.coverKey) : null}
              className="aspect-[4/3] animate-pop-in rounded-[var(--radius)] border-[length:var(--border-w)] border-line shadow-pop sm:aspect-[16/10] lg:aspect-square"
            />
            <RsvpPanel shareUrl={path} />
          </aside>

          <main id="main" className="mt-6 flex min-w-0 flex-col gap-9 lg:mt-0">
            <header className="animate-fade-up">
              {cancelled ? <p className="chip mb-3 !bg-danger !text-bg">Cancelled</p> : null}
              {query.emails === "off" ? (
                <DismissibleNote>
                  <p className="font-bold">You won’t get more emails about this event.</p>
                </DismissibleNote>
              ) : null}
              <p className="eyebrow">You’re invited · Hosted by {event.hostName}</p>
              <h1 className="display mt-2 text-[clamp(2.5rem,1.6rem+4.5vw,4.25rem)] [overflow-wrap:anywhere]">{event.title}</h1>
            </header>

            <div className="flex animate-fade-up flex-col gap-3 [animation-delay:60ms]">
              <div className="card flex items-center gap-4 p-4">
                {event.startsAt ? (
                  <div className="flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-xl border-[length:var(--border-w)] border-line text-center leading-none" aria-hidden="true">
                    <span className="w-full bg-accent py-1 text-[0.6875rem] font-extrabold tracking-wider text-accent-fg">
                      {monthAbbr(event.startsAt, tz)}
                    </span>
                    <span className="py-1.5 text-2xl font-extrabold tabular-nums">{dayOfMonth(event.startsAt, tz)}</span>
                  </div>
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl border-[length:var(--border-w)] border-line">
                    <CalendarDays size={24} aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {event.startsAt ? (
                    <>
                      <p className="text-lg font-bold leading-tight">{formatDay(event.startsAt, tz)}</p>
                      <p className="text-muted">
                        {formatTimeRange(event.startsAt, event.endsAt, tz)}
                        {past ? "" : ` · ${relativeDay(event.startsAt, tz, now)}`}
                      </p>
                      <LocalTimeNote startsAt={event.startsAt} timezone={tz} />
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold leading-tight">Date to be decided</p>
                      <p className="text-muted">
                        <a href="#poll" className="linkish">Vote on the options</a>
                      </p>
                    </>
                  )}
                </div>
              </div>

              {place ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.locationAddress || place)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card group flex items-center gap-4 p-4"
                >
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl border-[length:var(--border-w)] border-line">
                    <MapPin size={24} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold leading-tight">{event.locationName || event.locationAddress}</span>
                    {event.locationName && event.locationAddress ? (
                      <span className="block text-muted">{event.locationAddress}</span>
                    ) : null}
                    <span className="sr-only"> (opens in maps)</span>
                  </span>
                  <ExternalLink size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </a>
              ) : null}

              {event.onlineUrl ? (
                <a href={event.onlineUrl} target="_blank" rel="noopener noreferrer nofollow" className="card group flex items-center gap-4 p-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl border-[length:var(--border-w)] border-line">
                    <Video size={24} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold leading-tight">Join online</span>
                    <span className="block truncate text-muted">{event.onlineUrl.replace(/^https?:\/\//, "")}</span>
                  </span>
                  <ExternalLink size={18} className="shrink-0 text-muted" aria-hidden="true" />
                </a>
              ) : null}

              {calendar && !cancelled && !past ? (
                <div>
                  <CalendarButton
                    ics={`${path}/calendar.ics`}
                    google={googleCalendarUrl(calendar)}
                    outlook={outlookCalendarUrl(calendar)}
                  />
                </div>
              ) : null}
            </div>

            {event.description ? (
              <RichText text={event.description} className="animate-fade-up text-[1.0625rem] leading-relaxed [animation-delay:120ms]" />
            ) : null}

            {event.pollOpen && view.poll.length > 0 ? (
              <DatePoll
                eventId={event.id}
                options={view.poll.map((o) => ({
                  id: o.id,
                  day: formatDay(o.startsAt, tz),
                  time: `${formatTime(o.startsAt, tz)} ${tzAbbr(o.startsAt, tz)}`,
                  votes: o.votes,
                  voters: o.voters,
                  mine: o.mine,
                }))}
              />
            ) : null}

            <GuestList
              counts={view.counts}
              faces={view.faces}
              guests={view.guests}
              canSee={view.canSeeGuests}
              visibility={event.guestListVisibility}
              hostName={event.hostName}
            />

            {event.bringEnabled ? <BringList eventId={event.id} items={view.bring} /> : null}
            {event.wallEnabled ? <Wall eventId={event.id} posts={view.posts} hidden={view.hiddenPosts} now={now} /> : null}
            {event.photosEnabled ? <PhotoAlbum eventId={event.id} photos={view.photos} hidden={view.hiddenPhotos} /> : null}

            <footer className="mt-4 flex flex-col items-start gap-3 border-t-[length:var(--border-w)] border-line/20 pt-6">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted">
                <LogoMark size={22} /> Made with punchface
              </Link>
              <p className="text-sm text-muted">
                Free invites with no ads and no account needed to reply.{" "}
                <Link href="/new" className="linkish">Make your own</Link>
              </p>
            </footer>
          </main>
        </div>
        <AutoRefresh />
      </RsvpProvider>
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading invite">
      <div className="mx-auto max-w-[1100px] px-4 pt-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:pt-10">
        <div className="skeleton aspect-[4/3] !rounded-[20px] sm:aspect-[16/10] lg:aspect-square" />
        <div className="mt-6 flex flex-col gap-4 lg:mt-0">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-14 w-4/5" />
          <div className="skeleton mt-4 h-[88px] !rounded-[20px]" />
          <div className="skeleton h-[88px] !rounded-[20px]" />
          <div className="skeleton mt-4 h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
