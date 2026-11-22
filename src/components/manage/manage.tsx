"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BellRing, Download, Mail, MoreHorizontal, Send, Trash2, UserPlus } from "lucide-react";
import { deleteEvent, lockPollDate, setEventCancelled } from "@/actions/events";
import {
  addGuestByName,
  addGuests,
  nudgeNoReplies,
  postUpdate,
  removeGuest,
  resendInvite,
  sendPendingInvites,
  setGuestStatus,
} from "@/actions/guests";
import type { GuestStatus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/constants";
import { cx, plural, type ActionResult } from "@/lib/utils";
import { Avatar, EmptyState, Spinner } from "../ui/bits";
import { fireConfetti } from "../ui/confetti";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

function useAction() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult<unknown>>, onOk?: () => void) =>
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) return toast.error(result.error);
        if (result.message) toast.success(result.message);
        onOk?.();
      } catch (e) {
        // redirect() from an action surfaces as a thrown navigation; let it through.
        if (e && typeof e === "object" && "digest" in e) throw e;
        toast.error("Something went wrong. Check your connection and try again.");
      }
    });
  return [pending, run] as const;
}

/** One-off burst when the host lands here straight after creating the invite. */
export function Celebrate() {
  useEffect(() => {
    fireConfetti();
    // Drop ?created=1 so a refresh doesn’t celebrate again.
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  return null;
}

// --- Invite by email ---------------------------------------------------------

export function InviteByEmail({ eventId, unsent, emailReady }: { eventId: string; unsent: number; emailReady: boolean }) {
  const [raw, setRaw] = useState("");
  const [pending, run] = useAction();
  const found = raw.split(/[\n,;]+/).filter((s) => /\S+@\S+\.\S+/.test(s)).length;

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-lg font-extrabold">
        <Mail size={20} aria-hidden="true" /> Invite by email
      </h3>
      <p className="mt-1 text-[0.9375rem] text-muted">
        Each person gets their own link, so their reply lands under their name. One per line, with or without a name.
      </p>
      <label htmlFor="guest-emails" className="sr-only">Names and email addresses</label>
      <textarea
        id="guest-emails"
        className="input mt-3 !min-h-[108px] font-medium"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={"Sam Rivera sam@example.com\njo@example.com\nPriya <priya@example.com>"}
        autoCapitalize="none"
        spellCheck={false}
      />
      {!emailReady ? (
        <p className="field-hint">
          Email delivery isn’t connected on this server yet, so invites are saved to the{" "}
          <Link href="/dev/outbox" className="linkish">dev outbox</Link> instead of being sent.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending || found === 0}
          onClick={() => run(() => addGuests(eventId, raw, true), () => setRaw(""))}
        >
          {pending ? <Spinner /> : <Send size={18} aria-hidden="true" />}
          {found > 0 ? `Send ${plural(found, "invite")}` : "Send invites"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={pending || found === 0}
          onClick={() => run(() => addGuests(eventId, raw, false), () => setRaw(""))}
        >
          Add without sending
        </button>
        {unsent > 0 ? (
          <button type="button" className="btn" disabled={pending} onClick={() => run(() => sendPendingInvites(eventId))}>
            Send {plural(unsent, "waiting invite")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// --- Guests ------------------------------------------------------------------

export type ManageGuest = {
  id: string;
  name: string;
  email: string | null;
  status: GuestStatus;
  plusOnes: number;
  note: string;
  invited: boolean;
};

const FILTERS: Array<{ key: GuestStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "going", label: "Going" },
  { key: "maybe", label: "Maybe" },
  { key: "declined", label: "Can’t go" },
  { key: "invited", label: "No reply" },
  { key: "waitlist", label: "Waitlist" },
];

export function GuestManager({ eventId, slug, guests }: { eventId: string; slug: string; guests: ManageGuest[] }) {
  const [filter, setFilter] = useState<GuestStatus | "all">("all");
  const [adding, setAdding] = useState(false);
  const [menuFor, setMenuFor] = useState<ManageGuest | null>(null);
  const [pending, run] = useAction();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"going" | "maybe" | "declined">("going");

  const count = (key: GuestStatus | "all") => (key === "all" ? guests.length : guests.filter((g) => g.status === key).length);
  const shown = filter === "all" ? guests : guests.filter((g) => g.status === filter);
  const noReplyWithEmail = guests.filter((g) => g.status === "invited" && g.email).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setAdding(true)}>
          <UserPlus size={16} aria-hidden="true" /> Add guest
        </button>
        {noReplyWithEmail > 0 ? (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(() => nudgeNoReplies(eventId))}>
            <BellRing size={16} aria-hidden="true" /> Nudge {plural(noReplyWithEmail, "no-reply", "no-replies")}
          </button>
        ) : null}
        <a href={`/e/${slug}/guests.csv`} className="btn btn-sm" download>
          <Download size={16} aria-hidden="true" /> Export CSV
        </a>
        {pending ? <span className="grid place-items-center px-1"><Spinner /></span> : null}
      </div>

      <div role="group" aria-label="Filter guests" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.filter((f) => f.key === "all" || count(f.key) > 0).map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            className={cx("chip min-h-10 shrink-0", filter === f.key && "!bg-fg !text-bg")}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <span className="tabular-nums opacity-70">{count(f.key)}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState emoji="👀" title={guests.length === 0 ? "No replies yet" : "Nobody here"}>
          {guests.length === 0 ? "Share your link and replies will show up here as they come in." : undefined}
        </EmptyState>
      ) : (
        <ul className="card divide-y-2 divide-line/10 overflow-hidden">
          {shown.map((g) => (
            <li key={g.id} className="flex items-center gap-3 px-3.5 py-3">
              <Avatar name={g.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold leading-tight">
                  {g.name}
                  {g.plusOnes > 0 ? <span className="font-medium text-muted"> +{g.plusOnes}</span> : null}
                </p>
                <p className="truncate text-sm text-muted">
                  {g.note ? `“${g.note}”` : (g.email ?? (g.status === "invited" ? "Added by you" : "Replied by link"))}
                </p>
              </div>
              <label className="sr-only" htmlFor={`status-${g.id}`}>Reply for {g.name}</label>
              <select
                id={`status-${g.id}`}
                className="input !min-h-10 !w-[7.25rem] shrink-0 !px-2 !py-1 text-sm font-bold"
                value={g.status}
                disabled={pending}
                onChange={(e) => run(() => setGuestStatus(g.id, e.target.value as "going" | "maybe" | "declined" | "invited"))}
              >
                <option value="going">{STATUS_LABEL.going}</option>
                <option value="maybe">{STATUS_LABEL.maybe}</option>
                <option value="declined">{STATUS_LABEL.declined}</option>
                <option value="invited">No reply</option>
                {g.status === "waitlist" ? <option value="waitlist">Waitlist</option> : null}
              </select>
              <button type="button" className="btn btn-ghost btn-icon btn-sm -mr-1.5" onClick={() => setMenuFor(g)} aria-label={`More options for ${g.name}`}>
                <MoreHorizontal size={20} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a guest" description="For people who replied in person or by text.">
        <form
          className="flex flex-col gap-4 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => addGuestByName(eventId, name, status),
              () => {
                setName("");
                setAdding(false);
              },
            );
          }}
        >
          <div>
            <label htmlFor="add-name" className="field-label">Name</label>
            <input id="add-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" required />
          </div>
          <div>
            <label htmlFor="add-status" className="field-label">Their reply</label>
            <select id="add-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="going">Going</option>
              <option value="maybe">Maybe</option>
              <option value="declined">Can’t go</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={pending || !name.trim()}>
            {pending ? <Spinner /> : null} Add guest
          </button>
        </form>
      </Sheet>

      <Sheet open={Boolean(menuFor)} onClose={() => setMenuFor(null)} title={menuFor?.name ?? "Guest"} description={menuFor?.email ?? undefined}>
        {menuFor ? (
          <div className="flex flex-col gap-2.5 pb-2">
            {menuFor.note ? <p className="card p-3 text-[0.9375rem]">“{menuFor.note}”</p> : null}
            {menuFor.email ? (
              <button
                type="button"
                className="btn btn-lg justify-start"
                disabled={pending}
                onClick={() => run(() => resendInvite(menuFor.id), () => setMenuFor(null))}
              >
                <Send size={18} aria-hidden="true" /> {menuFor.invited ? "Resend invite email" : "Send invite email"}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-lg justify-start !text-danger"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Remove ${menuFor.name} from the guest list?`)) run(() => removeGuest(menuFor.id), () => setMenuFor(null));
              }}
            >
              <Trash2 size={18} aria-hidden="true" /> Remove from guest list
            </button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

// --- Poll results ------------------------------------------------------------

export function PollResults({
  eventId,
  options,
}: {
  eventId: string;
  options: Array<{ id: string; label: string; votes: number; voters: string[] }>;
}) {
  const [pending, run] = useAction();
  const top = Math.max(0, ...options.map((o) => o.votes));
  return (
    <div className="card p-4 sm:p-5">
      <h3 className="text-lg font-extrabold">Date poll</h3>
      <p className="mt-1 text-[0.9375rem] text-muted">Lock in a date when you’re ready. Guests with an email get told.</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {options.map((o) => (
          <li key={o.id} className="flex items-center gap-3 rounded-2xl border-2 border-line/15 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-tight">
                {o.label} {top > 0 && o.votes === top ? <span className="chip chip-accent ml-1 !min-h-0 px-2 py-0.5 text-xs">Leading</span> : null}
              </p>
              <p className="truncate text-sm text-muted">
                {plural(o.votes, "vote")}
                {o.voters.length ? ` · ${o.voters.join(", ")}` : ""}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Set the date to ${o.label} and close the poll?`)) run(() => lockPollDate(eventId, o.id, true));
              }}
            >
              Lock in
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Messages ----------------------------------------------------------------

export function UpdateComposer({ eventId, reachable }: { eventId: string; reachable: number }) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(true);
  const [pending, run] = useAction();
  return (
    <form
      className="card flex flex-col gap-3 p-4 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => postUpdate(eventId, message, email && reachable > 0), () => setMessage(""));
      }}
    >
      <label htmlFor="update-message" className="text-lg font-extrabold">Message your guests</label>
      <textarea
        id="update-message"
        className="input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        placeholder="Change of plan: we’re starting at 8, not 7. Bring a jumper, the heating is feral."
      />
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[0.9375rem] font-semibold">
        <input
          type="checkbox"
          className="size-5 accent-[var(--accent)]"
          checked={email && reachable > 0}
          disabled={reachable === 0}
          onChange={(e) => setEmail(e.target.checked)}
        />
        {reachable > 0
          ? `Also email ${plural(reachable, "guest")} who shared an address`
          : "No guests have shared an email yet, so this posts to the invite only"}
      </label>
      <button type="submit" className="btn btn-primary self-start" disabled={pending || message.trim().length < 2}>
        {pending ? <Spinner /> : <Send size={18} aria-hidden="true" />} Post update
      </button>
    </form>
  );
}

// --- Danger zone -------------------------------------------------------------

export function DangerZone({ eventId, cancelled, title }: { eventId: string; cancelled: boolean; title: string }) {
  const [pending, run] = useAction();
  return (
    <div className="card flex flex-col gap-3 p-4 sm:p-5">
      <h3 className="text-lg font-extrabold">Cancel or delete</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() => {
            if (cancelled) return run(() => setEventCancelled(eventId, false));
            if (window.confirm("Cancel this event? Guests with an email will be told.")) run(() => setEventCancelled(eventId, true));
          }}
        >
          {cancelled ? "Un-cancel event" : "Cancel event"}
        </button>
        <button
          type="button"
          className="btn !text-danger"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Delete “${title}” for good? Replies, messages and photos go with it. This can’t be undone.`)) {
              run(() => deleteEvent(eventId));
            }
          }}
        >
          <Trash2 size={18} aria-hidden="true" /> Delete event
        </button>
      </div>
      <p className="text-sm text-muted">
        Cancelling keeps the page up with a “cancelled” banner. Deleting removes everything.
      </p>
    </div>
  );
}
