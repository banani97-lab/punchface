import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { Eye, PartyPopper, Pencil } from "lucide-react";
import { EventCover } from "@/components/cover/event-cover";
import { CopyLink, ShareButton } from "@/components/event/share";
import {
  Celebrate,
  DangerZone,
  GuestManager,
  InviteByEmail,
  PollResults,
  UpdateComposer,
  type ManageGuest,
} from "@/components/manage/manage";
import { QrCode } from "@/components/manage/qr";
import { EmptyState } from "@/components/ui/bits";
import { db, schema } from "@/db";
import { countGuests, getEventBySlug } from "@/lib/data";
import { emailConfigured } from "@/lib/email";
import { requestNow, requestOrigin } from "@/lib/request";
import { getViewer } from "@/lib/session";
import { imageUrl } from "@/lib/storage";
import { getTheme } from "@/lib/themes";
import { formatDay, formatTime, formatWhen, timeAgo } from "@/lib/time";
import { cx, plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Manage invite", robots: { index: false } };

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "guests", label: "Guests" },
  { key: "messages", label: "Messages" },
  { key: "settings", label: "Settings" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function ManagePage({ params, searchParams }: PageProps<"/e/[slug]/manage">) {
  return (
    <Suspense fallback={<ManageSkeleton />}>
      <Manage params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Manage({ params, searchParams }: Pick<PageProps<"/e/[slug]/manage">, "params" | "searchParams">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const [event, viewer, origin] = await Promise.all([getEventBySlug(slug), getViewer(), requestOrigin()]);
  // Same response for "missing" and "not yours", so slugs can’t be probed.
  if (!event || !viewer || viewer.id !== event.hostId) notFound();

  const tab: TabKey = TABS.find((t) => t.key === query.tab)?.key ?? "overview";
  const guests = await db.select().from(schema.guests).where(eq(schema.guests.eventId, event.id)).orderBy(asc(schema.guests.createdAt));
  const counts = countGuests(guests);
  const theme = getTheme(event.themeId);
  const path = `/e/${event.slug}`;
  const tz = event.timezone;
  const now = await requestNow();
  const unsent = guests.filter((g) => g.status === "invited" && g.email && !g.inviteSentAt).length;
  const reachable = guests.filter((g) => g.email && !g.emailOptOut && g.status !== "declined").length;
  const nameById = new Map(guests.map((g) => [g.id, g.name]));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 sm:px-6">
      {query.created ? <Celebrate /> : null}

      <header className="flex items-center gap-4">
        <EventCover
          theme={theme}
          emoji={event.emoji}
          seed={event.id}
          imageUrl={event.coverKey ? imageUrl(event.coverKey, "thumb") : null}
          animated={false}
          className="size-[72px] shrink-0 rounded-2xl border-2 border-line shadow-pop-sm"
        />
        <div className="min-w-0 flex-1">
          <h1 className="display truncate text-[1.75rem] sm:text-[2.125rem]">{event.title}</h1>
          <p className="truncate text-muted">
            {event.status === "cancelled" ? <span className="font-bold text-danger">Cancelled · </span> : null}
            {formatWhen(event.startsAt, event.endsAt, tz)}
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={path} className="btn btn-sm" prefetch={true}>
          <Eye size={16} aria-hidden="true" /> View invite
        </Link>
        <Link href={`${path}/edit`} className="btn btn-sm">
          <Pencil size={16} aria-hidden="true" /> Edit
        </Link>
        <ShareButton url={path} title={event.title} label="Share" className="btn btn-sm btn-primary" />
      </div>

      {query.created ? (
        <div className="card mt-6 flex animate-pop-in items-start gap-3 !bg-accent-2 p-4 !text-[#1b1325]">
          <PartyPopper size={24} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-lg font-extrabold leading-tight">Your invite is live!</p>
            <p className="text-[0.9375rem]">Share the link below however you like: group chat, text, email, carrier pigeon.</p>
          </div>
        </div>
      ) : null}

      {!viewer.email ? (
        <div className="card mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-[0.9375rem]">
            <strong className="block text-base">This invite is saved to this browser only.</strong>
            Add your email to manage it from any device and get notified when people reply.
          </p>
          <Link href="/login" className="btn btn-ink shrink-0">Save my invites</Link>
        </div>
      ) : null}

      <nav aria-label="Manage sections" className="no-scrollbar -mx-4 mt-6 flex gap-1 overflow-x-auto border-b-2 border-line/15 px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`${path}/manage${t.key === "overview" ? "" : `?tab=${t.key}`}`}
            aria-current={tab === t.key ? "page" : undefined}
            prefetch={true}
            className={cx(
              "-mb-0.5 flex min-h-12 shrink-0 items-center border-b-[3px] px-3 font-bold",
              tab === t.key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {t.label}
            {t.key === "guests" && guests.length > 0 ? <span className="ml-1.5 text-sm tabular-nums opacity-70">{guests.length}</span> : null}
          </Link>
        ))}
      </nav>

      <div className="mt-6 flex flex-col gap-5">
        {tab === "overview" ? (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Going", value: counts.heads, sub: counts.heads !== counts.going ? `${plural(counts.going, "reply", "replies")} + guests` : event.capacity ? `of ${event.capacity} spots` : "people" },
                { label: "Maybe", value: counts.maybe, sub: "on the fence" },
                { label: "Can’t go", value: counts.declined, sub: "next time" },
                { label: counts.waitlist > 0 ? "Waitlist" : "No reply", value: counts.waitlist > 0 ? counts.waitlist : counts.invited, sub: counts.waitlist > 0 ? "hoping for a spot" : "invited by email" },
              ].map((s) => (
                <div key={s.label} className="card p-4">
                  <dt className="eyebrow">{s.label}</dt>
                  <dd className="display mt-1 text-[2.5rem] tabular-nums">{s.value}</dd>
                  <dd className="text-sm text-muted">{s.sub}</dd>
                </div>
              ))}
            </dl>

            <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold">Share the link</h2>
                <p className="mt-1 text-[0.9375rem] text-muted">Anyone with the link can reply. No app, no account.</p>
                <CopyLink url={path} className="mt-3" />
              </div>
              <QrCode value={`${origin}${path}`} />
            </div>

            <InviteByEmail eventId={event.id} unsent={unsent} emailReady={emailConfigured()} />

            {event.pollOpen ? <PollSection eventId={event.id} tz={tz} nameById={nameById} /> : null}
            {event.bringEnabled ? <BringSummary eventId={event.id} nameById={nameById} /> : null}
          </>
        ) : null}

        {tab === "guests" ? (
          <GuestManager
            eventId={event.id}
            slug={event.slug}
            guests={guests.map(
              (g): ManageGuest => ({
                id: g.id,
                name: g.name,
                email: g.email,
                status: g.status,
                plusOnes: g.plusOnes,
                note: g.note,
                invited: Boolean(g.inviteSentAt),
              }),
            )}
          />
        ) : null}

        {tab === "messages" ? (
          <>
            <UpdateComposer eventId={event.id} reachable={reachable} />
            <PastUpdates eventId={event.id} now={now} />
          </>
        ) : null}

        {tab === "settings" ? (
          <>
            <div className="card flex flex-col gap-3 p-4 sm:p-5">
              <h2 className="text-lg font-extrabold">Invite details</h2>
              <p className="text-[0.9375rem] text-muted">
                Change the date, place, look, bring list and guest options. Guests see changes straight away.
              </p>
              <Link href={`${path}/edit`} className="btn self-start">
                <Pencil size={18} aria-hidden="true" /> Edit invite
              </Link>
            </div>
            <DangerZone eventId={event.id} cancelled={event.status === "cancelled"} title={event.title} />
          </>
        ) : null}
      </div>
    </div>
  );
}

async function PollSection({ eventId, tz, nameById }: { eventId: string; tz: string; nameById: Map<string, string> }) {
  const options = await db.select().from(schema.pollOptions).where(eq(schema.pollOptions.eventId, eventId)).orderBy(asc(schema.pollOptions.startsAt));
  if (options.length === 0) return null;
  const votes = await db.select().from(schema.pollVotes).where(inArray(schema.pollVotes.optionId, options.map((o) => o.id)));
  return (
    <PollResults
      eventId={eventId}
      options={options.map((o) => {
        const mine = votes.filter((v) => v.optionId === o.id);
        return {
          id: o.id,
          label: `${formatDay(o.startsAt, tz)}, ${formatTime(o.startsAt, tz)}`,
          votes: mine.length,
          voters: mine.map((v) => nameById.get(v.guestId) ?? "Guest"),
        };
      })}
    />
  );
}

async function BringSummary({ eventId, nameById }: { eventId: string; nameById: Map<string, string> }) {
  const items = await db.select().from(schema.bringItems).where(eq(schema.bringItems.eventId, eventId)).orderBy(asc(schema.bringItems.position));
  const claims = items.length
    ? await db.select().from(schema.bringClaims).where(inArray(schema.bringClaims.itemId, items.map((i) => i.id)))
    : [];
  return (
    <div className="card p-4 sm:p-5">
      <h2 className="text-lg font-extrabold">Bring list</h2>
      {items.length === 0 ? (
        <p className="mt-1 text-[0.9375rem] text-muted">Nothing on the list yet. Add items from Edit.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => {
            const mine = claims.filter((c) => c.itemId === item.id);
            const claimed = mine.reduce((n, c) => n + c.quantity, 0);
            return (
              <li key={item.id} className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">
                  {item.label}
                  {item.quantity > 1 ? <span className="text-muted"> ×{item.quantity}</span> : null}
                </span>
                <span className={cx("text-right text-sm", claimed >= item.quantity ? "font-bold text-ok" : "text-muted")}>
                  {mine.length ? mine.map((c) => nameById.get(c.guestId) ?? "Guest").join(", ") : "Unclaimed"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function PastUpdates({ eventId, now }: { eventId: string; now: number }) {
  const updates = (
    await db.select().from(schema.posts).where(eq(schema.posts.eventId, eventId)).orderBy(desc(schema.posts.createdAt)).limit(200)
  ).filter((p) => p.kind === "update");
  if (updates.length === 0) {
    return <EmptyState emoji="📣" title="No updates sent yet">Updates show at the top of the invite’s wall.</EmptyState>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {updates.map((u) => (
        <li key={u.id} className="card p-4">
          <p className="eyebrow">Sent {timeAgo(u.createdAt, now)}</p>
          <p className="mt-1.5 whitespace-pre-line">{u.body}</p>
        </li>
      ))}
    </ul>
  );
}

function ManageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-4">
        <div className="skeleton size-[72px] !rounded-2xl" />
        <div className="flex-1">
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton mt-2 h-4 w-1/2" />
        </div>
      </div>
      <div className="skeleton mt-8 h-10 w-full" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 !rounded-[20px]" />
        ))}
      </div>
      <div className="skeleton mt-5 h-44 !rounded-[20px]" />
    </div>
  );
}
