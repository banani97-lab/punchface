"use client";

import { createContext, use, useCallback, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Check, Pencil, Settings2 } from "lucide-react";
import { submitRsvp } from "@/actions/rsvp";
import { STATUS_EMOJI } from "@/lib/constants";
import { cx, firstName } from "@/lib/utils";
import { Spinner, Stepper } from "../ui/bits";
import { fireConfetti } from "../ui/confetti";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";
import { ShareButton } from "./share";

type ReplyStatus = "going" | "maybe" | "declined";

export type RsvpData = {
  eventId: string;
  slug: string;
  title: string;
  hostName: string;
  isHost: boolean;
  cancelled: boolean;
  past: boolean;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  /** Seats still free, or null when the event has no limit. */
  seatsLeft: number | null;
  pollOpen: boolean;
  pollOptions: Array<{ id: string; label: string; mine: boolean }>;
  me: {
    name: string;
    email: string;
    status: "invited" | "going" | "maybe" | "declined" | "waitlist";
    plusOnes: number;
    note: string;
  } | null;
  viewerName: string;
};

type RsvpApi = { data: RsvpData; open: (status?: ReplyStatus) => void };

const RsvpContext = createContext<RsvpApi | null>(null);

export function useRsvp(): RsvpApi {
  const api = use(RsvpContext);
  if (!api) throw new Error("useRsvp must be used inside <RsvpProvider>");
  return api;
}

const CHOICES: Array<{ status: ReplyStatus; label: string; emoji: string }> = [
  { status: "going", label: "Going", emoji: "🎉" },
  { status: "maybe", label: "Maybe", emoji: "🤔" },
  { status: "declined", label: "Can’t go", emoji: "😢" },
];

/** Holds the reply sheet so any section of the page can open it. */
export function RsvpProvider({ data, children }: { data: RsvpData; children: ReactNode }) {
  const [sheet, setSheet] = useState<{ open: boolean; status: ReplyStatus; key: number }>({
    open: false,
    status: "going",
    key: 0,
  });

  const open = useCallback(
    (status?: ReplyStatus) => {
      const current = data.me && data.me.status !== "invited" && data.me.status !== "waitlist" ? data.me.status : "going";
      setSheet((s) => ({ open: true, status: status ?? current, key: s.key + 1 }));
    },
    [data.me],
  );

  const api = useMemo(() => ({ data, open }), [data, open]);

  return (
    <RsvpContext value={api}>
      {children}
      <Sheet
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        title={data.me && data.me.status !== "invited" ? "Change your reply" : "Your reply"}
        description={`${data.title} · hosted by ${data.hostName}`}
      >
        <RsvpForm key={sheet.key} data={data} initialStatus={sheet.status} onDone={() => setSheet((s) => ({ ...s, open: false }))} />
      </Sheet>
    </RsvpContext>
  );
}

function RsvpForm({ data, initialStatus, onDone }: { data: RsvpData; initialStatus: ReplyStatus; onDone: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<ReplyStatus>(initialStatus);
  const [name, setName] = useState(data.me?.name ?? data.viewerName);
  const [email, setEmail] = useState(data.me?.email ?? "");
  const [plusOnes, setPlusOnes] = useState(data.me?.plusOnes ?? 0);
  const [note, setNote] = useState(data.me?.note ?? "");
  const [votes, setVotes] = useState<string[]>(data.pollOptions.filter((o) => o.mine).map((o) => o.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const wasGoing = data.me?.status === "going";
  const seatsForMe = data.seatsLeft === null ? null : data.seatsLeft + (wasGoing ? 1 + (data.me?.plusOnes ?? 0) : 0);
  const willWaitlist = status === "going" && seatsForMe !== null && 1 + plusOnes > seatsForMe;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError("");
    if (!name.trim()) {
      setErrors({ name: "Add your name so the host knows who’s coming" });
      return;
    }
    startTransition(async () => {
      const result = await submitRsvp({
        eventId: data.eventId,
        status,
        name,
        email,
        plusOnes: status === "going" ? plusOnes : 0,
        note,
        pollOptionIds: status === "declined" ? [] : votes,
      });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        setFormError(result.error);
        return;
      }
      onDone();
      const saved = result.data.status;
      if (saved === "going") {
        fireConfetti();
        toast.success(`You’re in! Your reply is with ${data.hostName}.`);
      } else if (saved === "waitlist") {
        toast.success("You’re on the waitlist. We’ll email you if a spot opens up.");
      } else if (saved === "maybe") {
        toast.success("Marked as maybe. You can change it any time.");
      } else {
        toast.success("Reply sent. Thanks for letting them know.");
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 pb-1">
      <fieldset>
        <legend className="sr-only">Can you make it?</legend>
        <div className="grid grid-cols-3 gap-2">
          {CHOICES.map((c) => (
            <label
              key={c.status}
              className={cx(
                "btn h-auto min-h-[72px] flex-col gap-1 px-1 py-2.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg",
                status === c.status && "btn-primary",
              )}
            >
              <input
                type="radio"
                name="status"
                className="sr-only"
                checked={status === c.status}
                onChange={() => setStatus(c.status)}
              />
              <span className="text-2xl leading-none" aria-hidden="true">{c.emoji}</span>
              <span className="text-[0.9375rem]">{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="rsvp-name" className="field-label">Your name</label>
        <input
          id="rsvp-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={60}
          required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "rsvp-name-error" : undefined}
        />
        {errors.name ? <p id="rsvp-name-error" className="field-error">{errors.name}</p> : null}
      </div>

      {status === "going" && data.allowPlusOnes ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold">Bringing anyone?</p>
            <p className="text-sm text-muted">Up to {data.maxPlusOnes} extra {data.maxPlusOnes === 1 ? "person" : "people"}</p>
          </div>
          <Stepper value={plusOnes} onChange={setPlusOnes} max={data.maxPlusOnes} label="extra guests" />
        </div>
      ) : null}

      {willWaitlist ? (
        <p className="rounded-2xl border-[length:var(--border-w)] border-line bg-card px-4 py-3 text-[0.9375rem]">
          <strong>This one’s full.</strong> Send your reply to join the waitlist: you’ll move up automatically if a spot opens.
        </p>
      ) : null}

      {data.pollOpen && status !== "declined" && data.pollOptions.length > 0 ? (
        <fieldset>
          <legend className="field-label">Which dates work for you?</legend>
          <div className="flex flex-col gap-2">
            {data.pollOptions.map((o) => {
              const checked = votes.includes(o.id);
              return (
                <label
                  key={o.id}
                  className={cx(
                    "flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[var(--radius-btn)] border-[length:var(--border-w)] border-line px-3.5 py-2 font-semibold",
                    "has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg",
                    checked ? "bg-accent text-accent-fg" : "bg-card",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => setVotes((v) => (checked ? v.filter((id) => id !== o.id) : [...v, o.id]))}
                  />
                  <span
                    aria-hidden="true"
                    className={cx(
                      "grid size-6 shrink-0 place-items-center rounded-md border-2",
                      checked ? "border-accent-fg bg-accent-fg text-accent" : "border-line",
                    )}
                  >
                    {checked ? <Check size={16} strokeWidth={3.5} /> : null}
                  </span>
                  {o.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div>
        <label htmlFor="rsvp-email" className="field-label">
          Email <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="rsvp-email"
          type="email"
          inputMode="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "rsvp-email-error" : "rsvp-email-hint"}
        />
        {errors.email ? (
          <p id="rsvp-email-error" className="field-error">{errors.email}</p>
        ) : (
          <p id="rsvp-email-hint" className="field-hint">
            For a reminder and a link to change your reply. Only the host sees it. No marketing, ever.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="rsvp-note" className="field-label">
          Note for the host <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="rsvp-note"
          className="input !min-h-[76px]"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          placeholder={status === "declined" ? "Gutted to miss it!" : "Allergies, arriving late, song requests…"}
        />
      </div>

      {formError ? (
        <p role="alert" className="field-error !mt-0">{formError}</p>
      ) : null}

      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
        {pending ? <Spinner /> : null}
        {pending ? "Sending…" : willWaitlist ? "Join the waitlist" : "Send reply"}
      </button>
    </form>
  );
}

const REPLIED_LINE = {
  going: "You’re going",
  maybe: "You’re a maybe",
  declined: "You can’t make it",
  waitlist: "You’re on the waitlist",
} as const;

/**
 * The reply bar: docked to the bottom edge on phones (thumb reach), a card
 * under the cover on wide screens.
 */
export function RsvpPanel({ shareUrl }: { shareUrl: string }) {
  const { data, open } = useRsvp();
  const me = data.me;
  const replied = me && me.status !== "invited" ? me : null;

  let body: ReactNode;
  if (data.cancelled) {
    body = <p className="py-1 text-center font-bold">This event was cancelled.</p>;
  } else if (data.isHost) {
    body = (
      <div className="flex items-center gap-2.5">
        <p className="min-w-0 flex-1 font-bold leading-tight">
          You’re hosting
          <span className="block text-sm font-medium text-muted">This is what guests see.</span>
        </p>
        <ShareButton url={shareUrl} title={data.title} className="btn" label="Share" />
        <Link href={`/e/${data.slug}/manage`} className="btn btn-primary" prefetch={true}>
          <Settings2 size={18} aria-hidden="true" /> Manage
        </Link>
      </div>
    );
  } else if (data.past && !replied) {
    body = <p className="py-1 text-center font-bold">This one’s already happened.</p>;
  } else if (replied) {
    body = (
      <div className="flex items-center gap-2.5">
        <p className="min-w-0 flex-1 font-extrabold leading-tight">
          <span aria-hidden="true">{STATUS_EMOJI[replied.status]} </span>
          {REPLIED_LINE[replied.status as keyof typeof REPLIED_LINE]}
          {replied.status === "going" && replied.plusOnes > 0 ? ` +${replied.plusOnes}` : ""}
          <span className="block truncate text-sm font-medium text-muted">Replied as {replied.name}</span>
        </p>
        <ShareButton url={shareUrl} title={data.title} className="btn btn-icon" />
        {data.past ? null : (
          <button type="button" className="btn" onClick={() => open()}>
            <Pencil size={16} aria-hidden="true" /> Change
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <div>
        <p className="mb-2.5 text-center font-extrabold leading-tight lg:text-left">
          {me ? `${firstName(me.name)}, can you make it?` : data.pollOpen ? "In? Pick the dates that work" : "Can you make it?"}
        </p>
        <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-2">
          {CHOICES.map((c) => (
            <button
              key={c.status}
              type="button"
              className={cx("btn whitespace-nowrap px-2", c.status === "going" && "btn-primary")}
              onClick={() => open(c.status)}
            >
              {c.status === "going" ? <span aria-hidden="true">{c.emoji}</span> : null} {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "fixed inset-x-0 bottom-0 z-40 border-t-[length:var(--border-w)] border-line bg-bg px-4 pt-3 safe-bottom",
        "lg:static lg:z-auto lg:mt-6 lg:rounded-[var(--radius)] lg:border-[length:var(--border-w)] lg:bg-card lg:p-5 lg:shadow-pop",
      )}
    >
      <div className="mx-auto max-w-xl lg:max-w-none">{body}</div>
    </div>
  );
}
