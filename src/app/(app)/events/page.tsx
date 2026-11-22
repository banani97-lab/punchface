import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { signOut } from "@/actions/auth";
import { EventCover } from "@/components/cover/event-cover";
import { EmptyState } from "@/components/ui/bits";
import { STATUS_EMOJI, STATUS_LABEL } from "@/lib/constants";
import { listEventsForUser, type EventCard } from "@/lib/data";
import { requestNow } from "@/lib/request";
import { getViewer } from "@/lib/session";
import { imageUrl } from "@/lib/storage";
import { getTheme } from "@/lib/themes";
import { formatWhen, relativeDay } from "@/lib/time";

export const metadata: Metadata = { title: "My events", robots: { index: false } };

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 sm:px-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="display text-[clamp(2.25rem,1.6rem+3vw,3.25rem)]">My events</h1>
        <Link href="/new" className="btn btn-primary btn-sm">
          <Plus size={18} strokeWidth={3} aria-hidden="true" /> New invite
        </Link>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <EventLists searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EventLists({ searchParams }: Pick<PageProps<"/events">, "searchParams">) {
  const [viewer, query] = await Promise.all([getViewer(), searchParams]);
  const { hosting, attending } = viewer ? await listEventsForUser(viewer.id) : { hosting: [], attending: [] };
  const now = await requestNow();

  return (
    <div className="mt-6 flex flex-col gap-8">
      {query.welcome && viewer?.email ? (
        <p className="card !bg-accent-2 p-4 font-bold !text-[#1b1325]" role="status">
          You’re signed in as {viewer.email}. Your invites now follow you to any device.
        </p>
      ) : null}

      {!viewer?.email ? (
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-[0.9375rem]">
            <strong className="block text-base">
              {viewer ? "These are saved to this browser only." : "Looking for invites you made on another device?"}
            </strong>
            {viewer ? "Add your email to keep them safe and open them anywhere." : "Sign in with your email to see them here."}
          </p>
          <Link href="/login" className="btn btn-ink shrink-0">{viewer ? "Save my invites" : "Sign in"}</Link>
        </div>
      ) : null}

      <section aria-labelledby="hosting">
        <h2 id="hosting" className="eyebrow mb-3">Hosting</h2>
        {hosting.length === 0 ? (
          <EmptyState emoji="🪩" title="Nothing on the calendar">
            <Link href="/new" className="linkish">Make your first invite</Link>. It takes about two minutes.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {hosting.map((card) => (
              <EventRow key={card.event.id} card={card} now={now} href={`/e/${card.event.slug}/manage`} />
            ))}
          </ul>
        )}
      </section>

      {attending.length > 0 ? (
        <section aria-labelledby="attending">
          <h2 id="attending" className="eyebrow mb-3">Invited to</h2>
          <ul className="flex flex-col gap-3">
            {attending.map((card) => (
              <EventRow key={card.event.id} card={card} now={now} href={`/e/${card.event.slug}`} />
            ))}
          </ul>
        </section>
      ) : null}

      {viewer?.email ? (
        <form action={signOut} className="border-t-2 border-line/15 pt-5">
          <p className="mb-2 text-sm text-muted">Signed in as {viewer.email}</p>
          <button type="submit" className="btn btn-sm">Sign out</button>
        </form>
      ) : null}
    </div>
  );
}

function EventRow({ card, now, href }: { card: EventCard; now: number; href: string }) {
  const { event, counts, myStatus } = card;
  const theme = getTheme(event.themeId);
  const upcoming = event.startsAt && event.startsAt > now;
  return (
    <li>
      <Link href={href} prefetch={true} className="card flex items-center gap-4 p-3 transition-transform active:translate-x-0.5 active:translate-y-0.5">
        <EventCover
          theme={theme}
          emoji={event.emoji}
          seed={event.id}
          imageUrl={event.coverKey ? imageUrl(event.coverKey, "thumb") : null}
          animated={false}
          className="size-[76px] shrink-0 rounded-2xl border-2 border-line"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold leading-tight">{event.title}</p>
          <p className="truncate text-[0.9375rem] text-muted">{formatWhen(event.startsAt, event.endsAt, event.timezone)}</p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {event.status === "cancelled" ? (
              <span className="chip !min-h-7 !border-danger text-xs !text-danger">Cancelled</span>
            ) : upcoming ? (
              <span className="chip chip-accent !min-h-7 text-xs">{relativeDay(event.startsAt!, event.timezone, now)}</span>
            ) : null}
            {myStatus ? (
              <span className="chip !min-h-7 text-xs">
                <span aria-hidden="true">{STATUS_EMOJI[myStatus]}</span> {STATUS_LABEL[myStatus]}
              </span>
            ) : (
              <span className="chip !min-h-7 text-xs">
                {counts.heads} going{counts.maybe ? ` · ${counts.maybe} maybe` : ""}
              </span>
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-3" aria-busy="true" aria-label="Loading your events">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-[104px] !rounded-[20px]" />
      ))}
    </div>
  );
}
