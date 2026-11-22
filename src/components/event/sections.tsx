"use client";

import { useEffect, useOptimistic, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, ImagePlus, Lock, Megaphone, Plus, SendHorizontal, Trash2, X } from "lucide-react";
import { setPollVotes } from "@/actions/rsvp";
import { addPost, bringSomethingElse, claimItem, deletePhoto, deletePost, toggleReaction } from "@/actions/social";
import { REACTION_EMOJI, STATUS_LABEL } from "@/lib/constants";
import type { BringItemView, GuestSummary, PhotoView, PostView } from "@/lib/data";
import { timeAgo } from "@/lib/time";
import { cx, plural, type ActionResult } from "@/lib/utils";
import { Avatar, AvatarStack, EmptyState, Spinner } from "../ui/bits";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";
import { useRsvp } from "./rsvp";

/** Runs a server action, surfacing failures as a toast. */
function useAction() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult<unknown>>, onOk?: () => void) =>
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) toast.error(result.error);
        else onOk?.();
      } catch {
        toast.error("Something went wrong. Check your connection and try again.");
      }
    });
  return [pending, run] as const;
}

export function Section({ title, aside, children, id }: { title: string; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="display text-[1.625rem]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

// --- Guest list --------------------------------------------------------------

type GuestListProps = {
  counts: { going: number; heads: number; maybe: number; declined: number; waitlist: number };
  faces: string[];
  guests: GuestSummary[];
  canSee: boolean;
  visibility: "everyone" | "guests" | "host";
  hostName: string;
};

export function GuestList({ counts, faces, guests, canSee, visibility, hostName }: GuestListProps) {
  const [open, setOpen] = useState(false);
  const { open: openRsvp, data } = useRsvp();
  const nobody = counts.going + counts.maybe === 0;

  const summary = [
    counts.heads > 0 ? `${counts.heads} going` : "",
    counts.maybe > 0 ? `${counts.maybe} maybe` : "",
    counts.waitlist > 0 ? `${counts.waitlist} on the waitlist` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const groups = (["going", "maybe", "waitlist", "declined"] as const)
    .map((status) => ({ status, list: guests.filter((g) => g.status === status) }))
    .filter((g) => g.list.length > 0);

  return (
    <Section title="Who’s coming" id="guests">
      <div className="card flex items-center gap-3.5 p-4">
        <Avatar name={hostName} size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight">{nobody ? "Be the first to reply" : summary}</p>
          <p className="truncate text-sm text-muted">Hosted by {hostName}</p>
        </div>
        {visibility !== "host" && faces.length > 0 ? (
          <AvatarStack names={faces.slice(0, 4)} extra={Math.max(0, counts.going - 4)} />
        ) : null}
      </div>
      {canSee && guests.length > 0 ? (
        <button type="button" className="btn btn-sm mt-3" onClick={() => setOpen(true)}>
          See the guest list
        </button>
      ) : !canSee && visibility === "guests" && !nobody && !data.isHost ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Lock size={15} aria-hidden="true" />
          <span>
            <button type="button" className="linkish" onClick={() => openRsvp()}>
              Reply
            </button>{" "}
            to see who else is coming.
          </span>
        </p>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title="Guest list" description={summary || undefined}>
        <div className="flex flex-col gap-5 pb-2">
          {groups.map(({ status, list }) => (
            <div key={status}>
              <h3 className="eyebrow mb-2">
                {STATUS_LABEL[status]} · {list.length}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {list.map((g) => (
                  <li key={g.id} className="flex items-center gap-3">
                    <Avatar name={g.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {g.name}
                        {g.plusOnes > 0 ? <span className="font-normal text-muted"> +{g.plusOnes}</span> : null}
                      </span>
                      {g.note ? <span className="block text-sm text-muted">“{g.note}”</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Sheet>
    </Section>
  );
}

// --- Date poll ---------------------------------------------------------------

export type PollRow = { id: string; day: string; time: string; votes: number; voters: string[]; mine: boolean };

export function DatePoll({ eventId, options }: { eventId: string; options: PollRow[] }) {
  const { data, open } = useRsvp();
  const [pending, run] = useAction();
  const [optimistic, setOptimistic] = useOptimistic(options, (rows, id: string) =>
    rows.map((r) => (r.id === id ? { ...r, mine: !r.mine, votes: r.votes + (r.mine ? -1 : 1) } : r)),
  );
  const canVote = Boolean(data.me && data.me.status !== "invited");
  const top = Math.max(1, ...optimistic.map((o) => o.votes));

  function toggle(id: string) {
    if (!canVote) return open("going");
    const next = optimistic.filter((o) => (o.id === id ? !o.mine : o.mine)).map((o) => o.id);
    run(async () => {
      setOptimistic(id);
      return setPollVotes(eventId, next);
    });
  }

  return (
    <Section title="When works?" id="poll" aside={pending ? <Spinner /> : null}>
      <p className="-mt-1 mb-3 text-[0.9375rem] text-muted">
        The date isn’t fixed yet. Tick every option you could do.
      </p>
      <ul className="flex flex-col gap-2.5">
        {optimistic.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => toggle(o.id)}
              aria-pressed={o.mine}
              className={cx(
                "card relative flex min-h-16 w-full items-center gap-3 overflow-hidden px-4 py-3 text-left transition-transform active:translate-x-0.5 active:translate-y-0.5",
              )}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-accent/25 transition-[width] duration-500 ease-out"
                style={{ width: `${o.votes === 0 ? 0 : Math.max(8, (o.votes / top) * 100)}%` }}
              />
              <span
                aria-hidden="true"
                className={cx(
                  "relative grid size-7 shrink-0 place-items-center rounded-lg border-2 border-line",
                  o.mine ? "bg-accent text-accent-fg" : "bg-card",
                )}
              >
                {o.mine ? <Check size={18} strokeWidth={3.5} /> : null}
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block font-bold leading-tight">{o.day}</span>
                <span className="block text-sm text-muted">
                  {o.time}
                  {o.voters.length > 0 ? ` · ${o.voters.slice(0, 3).join(", ")}${o.voters.length > 3 ? ` +${o.voters.length - 3}` : ""}` : ""}
                </span>
              </span>
              <span className="relative shrink-0 text-lg font-extrabold tabular-nums">
                {o.votes}
                <span className="sr-only"> {o.votes === 1 ? "vote" : "votes"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// --- Bring list --------------------------------------------------------------

export function BringList({ eventId, items }: { eventId: string; items: BringItemView[] }) {
  const { data, open } = useRsvp();
  const [pending, run] = useAction();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const canClaim = Boolean(data.me) && !data.isHost;

  function claim(item: BringItemView, quantity: number) {
    if (data.isHost) return;
    if (!data.me) return open("going");
    run(() => claimItem(item.id, quantity));
  }

  function addOwn(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    run(
      () => bringSomethingElse(eventId, label),
      () => {
        setLabel("");
        setAdding(false);
      },
    );
  }

  return (
    <Section title="What to bring" id="bring" aside={pending ? <Spinner /> : null}>
      {items.length === 0 ? (
        <EmptyState emoji="🧺" title="Nothing on the list yet" />
      ) : (
        <ul className="card divide-y-[length:var(--border-w)] divide-line/15 overflow-hidden">
          {items.map((item) => {
            const left = Math.max(0, item.quantity - item.claimed);
            const full = left === 0;
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className={cx("font-bold leading-tight", full && item.mine === 0 && "text-muted line-through decoration-2")}>
                    {item.label}
                    {item.quantity > 1 ? <span className="font-medium text-muted"> ×{item.quantity}</span> : null}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {item.claims.length > 0
                      ? item.claims.map((c) => `${c.mine ? "You" : c.name}${c.quantity > 1 ? ` (${c.quantity})` : ""}`).join(", ")
                      : "Nobody yet"}
                    {!full && item.claimed > 0 ? ` · ${left} still needed` : ""}
                  </p>
                </div>
                {data.isHost ? null : item.mine > 0 ? (
                  <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => claim(item, 0)}>
                    <Check size={16} strokeWidth={3} aria-hidden="true" /> Mine
                    <span className="sr-only">: tap to release {item.label}</span>
                  </button>
                ) : full ? (
                  <span className="chip">Covered</span>
                ) : (
                  <button type="button" className="btn btn-sm" disabled={pending} onClick={() => claim(item, 1)}>
                    I’ll bring it
                    <span className="sr-only">: {item.label}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canClaim ? (
        adding ? (
          <form onSubmit={addOwn} className="mt-3 flex gap-2">
            <label htmlFor="bring-own" className="sr-only">What are you bringing?</label>
            <input
              id="bring-own"
              className="input min-w-0 flex-1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Homemade guac"
              maxLength={80}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={pending || !label.trim()}>
              Add
            </button>
          </form>
        ) : (
          <button type="button" className="btn btn-sm mt-3" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" /> I’ll bring something else
          </button>
        )
      ) : null}
    </Section>
  );
}

// --- Wall --------------------------------------------------------------------

const subscribeNoop = () => () => {};
/** False on the server and during hydration, true afterwards. */
function useHydrated() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

export function Wall({ eventId, posts, hidden, now }: { eventId: string; posts: PostView[]; hidden: number; now: number }) {
  const { data, open } = useRsvp();
  const [pending, run] = useAction();
  const [body, setBody] = useState("");
  const canPost = data.isHost || Boolean(data.me);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    run(
      () => addPost(eventId, body),
      () => setBody(""),
    );
  }

  return (
    <Section title="The wall" id="wall">
      {canPost ? (
        <form onSubmit={submit} className="card mb-4 flex items-end gap-2 p-2.5">
          <label htmlFor="wall-body" className="sr-only">Write a message to everyone</label>
          <textarea
            id="wall-body"
            className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none placeholder:text-muted/70 [field-sizing:content]"
            rows={1}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
            }}
            maxLength={1000}
            placeholder="Say something to the group…"
          />
          <button type="submit" className="btn btn-primary btn-icon" disabled={pending || !body.trim()} aria-label="Post message">
            {pending ? <Spinner /> : <SendHorizontal size={20} aria-hidden="true" />}
          </button>
        </form>
      ) : (
        <button type="button" className="card mb-4 flex min-h-14 w-full items-center gap-3 px-4 text-left text-muted" onClick={() => open()}>
          <Lock size={16} aria-hidden="true" />
          {hidden > 0 ? `Reply to the invite to read ${plural(hidden, "message")} from guests` : "Reply to the invite to join the chat"}
        </button>
      )}

      {posts.length === 0 && hidden > 0 ? null : posts.length === 0 ? (
        <EmptyState emoji="💬" title="Quiet so far">Hype it up, ask what to wear, call shotgun.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <PostItem key={p.id} post={p} now={now} canReact={canPost} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function PostItem({ post, now, canReact }: { post: PostView; now: number; canReact: boolean }) {
  const { open } = useRsvp();
  const [pending, run] = useAction();
  const hydrated = useHydrated();
  const [reactions, toggleOptimistic] = useOptimistic(post.reactions, (list, emoji: string) => {
    const hit = list.find((r) => r.emoji === emoji);
    if (!hit) return [...list, { emoji, count: 1, mine: true }];
    return list
      .map((r) => (r.emoji === emoji ? { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) } : r))
      .filter((r) => r.count > 0);
  });
  const isUpdate = post.kind === "update";

  function react(emoji: string) {
    if (!canReact) return open();
    run(async () => {
      toggleOptimistic(emoji);
      return toggleReaction(post.id, emoji);
    });
  }

  return (
    <li className={cx("card p-4", isUpdate && "!bg-accent !text-accent-fg")}>
      <div className="flex items-center gap-2.5">
        {isUpdate ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-current">
            <Megaphone size={18} aria-hidden="true" />
          </span>
        ) : (
          <Avatar name={post.authorName} />
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-bold">
            {post.authorName}
            {post.isHost ? <span className="chip ml-2 !min-h-0 px-2 py-0.5 text-xs align-middle">Host</span> : null}
          </p>
          <p className={cx("text-sm", !isUpdate && "text-muted")}>
            {isUpdate ? "Update · " : ""}
            <time dateTime={new Date(post.createdAt).toISOString()}>{timeAgo(post.createdAt, now)}</time>
          </p>
        </div>
        {post.canDelete ? (
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm -mr-1.5 text-current"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Delete this message?")) run(() => deletePost(post.id));
            }}
            aria-label={`Delete message from ${post.authorName}`}
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <p className="mt-2.5 whitespace-pre-line break-words">{post.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {reactions.map((r) => (
          <button
            key={r.emoji}
            type="button"
            onClick={() => react(r.emoji)}
            aria-pressed={r.mine}
            aria-label={`${r.emoji} ${plural(r.count, "reaction")}${r.mine ? ", including yours" : ""}`}
            className={cx(
              "inline-flex min-h-9 items-center gap-1 rounded-full border-2 px-2.5 text-sm font-bold tabular-nums transition-transform active:scale-95",
              r.mine ? "border-current bg-fg/10" : "border-current/20",
            )}
          >
            <span aria-hidden="true">{r.emoji}</span> {r.count}
          </button>
        ))}
        {hydrated ? (
          <details className="group relative">
            <summary
              className="inline-flex min-h-9 list-none items-center rounded-full border-2 border-current/20 px-2.5 text-sm font-bold [&::-webkit-details-marker]:hidden"
              aria-label="Add a reaction"
            >
              <span aria-hidden="true">☺︎ +</span>
            </summary>
            <div className="absolute bottom-full left-0 z-10 mb-1.5 flex gap-0.5 rounded-full border-2 border-line bg-card p-1 text-fg shadow-pop-sm">
              {REACTION_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="grid size-10 place-items-center rounded-full text-xl transition-transform hover:scale-125 active:scale-95"
                  onClick={(e) => {
                    e.currentTarget.closest("details")?.removeAttribute("open");
                    react(emoji);
                  }}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </li>
  );
}

// --- Photos ------------------------------------------------------------------

export function PhotoAlbum({ eventId, photos, hidden }: { eventId: string; photos: PhotoView[]; hidden: number }) {
  const { data, open } = useRsvp();
  const toast = useToast();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [viewing, setViewing] = useState<PhotoView | null>(null);
  const [pending, run] = useAction();
  const canAdd = data.isHost || Boolean(data.me);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 20);
    setProgress({ done: 0, total: list.length });
    let failed = "";
    for (const [i, file] of list.entries()) {
      try {
        const form = new FormData();
        form.set("file", await shrinkImage(file));
        const res = await fetch(`/api/events/${eventId}/photos`, { method: "POST", body: form });
        if (!res.ok) failed = ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Upload failed.";
      } catch {
        failed = "Upload failed. Check your connection and try again.";
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    if (failed) toast.error(failed);
    else toast.success(list.length === 1 ? "Photo added." : `${list.length} photos added.`);
    router.refresh();
  }

  return (
    <Section
      title="Photos"
      id="photos"
      aside={
        canAdd ? (
          <>
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              id="photo-input"
              onChange={(e) => upload(e.target.files)}
              disabled={Boolean(progress)}
            />
            <label
              htmlFor="photo-input"
              className={cx(
                "btn btn-sm has-[:focus-visible]:outline",
                progress && "pointer-events-none opacity-60",
              )}
            >
              {progress ? <Spinner size={16} /> : <ImagePlus size={16} aria-hidden="true" />}
              <span aria-live="polite">{progress ? `Uploading ${progress.done + 1 > progress.total ? progress.total : progress.done + 1} of ${progress.total}` : "Add photos"}</span>
            </label>
          </>
        ) : null
      }
    >
      {photos.length === 0 ? (
        <EmptyState emoji="📸" title={hidden > 0 ? `${plural(hidden, "photo")} in the album` : "No photos yet"}>
          {canAdd ? (
            "Everyone on the guest list can add to this album."
          ) : (
            <button type="button" className="linkish" onClick={() => open()}>
              {hidden > 0 ? "Reply to see them and add yours" : "Reply to add yours"}
            </button>
          )}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {photos.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="block aspect-square w-full overflow-hidden rounded-xl border-[length:var(--border-w)] border-line bg-card"
                onClick={() => setViewing(p)}
                aria-label={`Open photo from ${p.authorName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized thumbnails with immutable caching */}
                <img
                  src={`/media/${p.key}?v=thumb`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Photo"
        description={viewing ? `Added by ${viewing.authorName}` : undefined}
        wide
      >
        {viewing ? (
          <div className="pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- already resized on upload */}
            <img
              src={`/media/${viewing.key}`}
              alt={`Photo added by ${viewing.authorName}`}
              width={viewing.width}
              height={viewing.height}
              className="mx-auto max-h-[62dvh] w-auto rounded-xl border-[length:var(--border-w)] border-line object-contain"
            />
            {viewing.canDelete ? (
              <button
                type="button"
                className="btn btn-sm mt-4"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("Remove this photo from the album?")) return;
                  run(
                    () => deletePhoto(viewing.id),
                    () => setViewing(null),
                  );
                }}
              >
                <Trash2 size={16} aria-hidden="true" /> Remove photo
              </button>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </Section>
  );
}

/** Downscales big photos in the browser so uploads are quick on mobile data. */
async function shrinkImage(file: File, max = 2000): Promise<Blob> {
  if (file.size < 600_000 || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

// --- Calendar ----------------------------------------------------------------

export function CalendarButton({ ics, google, outlook }: { ics: string; google: string; outlook: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
        <CalendarPlus size={16} aria-hidden="true" /> Add to calendar
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add to calendar">
        <div className="flex flex-col gap-2.5 pb-2">
          <a href={ics} className="btn btn-lg justify-start" onClick={() => setOpen(false)}>
            <span aria-hidden="true">🗓️</span> Apple Calendar
          </a>
          <a href={google} target="_blank" rel="noopener noreferrer" className="btn btn-lg justify-start" onClick={() => setOpen(false)}>
            <span aria-hidden="true">📅</span> Google Calendar
          </a>
          <a href={outlook} target="_blank" rel="noopener noreferrer" className="btn btn-lg justify-start" onClick={() => setOpen(false)}>
            <span aria-hidden="true">📧</span> Outlook
          </a>
          <a href={ics} className="btn btn-lg justify-start" onClick={() => setOpen(false)}>
            <span aria-hidden="true">⬇️</span> Download .ics file
          </a>
        </div>
      </Sheet>
    </>
  );
}

// --- Small helpers -----------------------------------------------------------

/** Re-fetches the page while it’s visible, so new replies and comments appear. */
export function AutoRefresh({ seconds = 25 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && !document.querySelector("dialog[open]")) router.refresh();
    };
    const id = window.setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}

/** Shows the start in the visitor’s own timezone when it differs from the event’s. */
export function LocalTimeNote({ startsAt, timezone }: { startsAt: number; timezone: string }) {
  const local = useSyncExternalStore(
    subscribeNoop,
    () => {
      const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (mine === timezone) return "";
      const at = (tz: string) =>
        new Intl.DateTimeFormat("en-US", { timeZone: tz, dateStyle: "short", timeStyle: "short" }).format(startsAt);
      if (at(mine) === at(timezone)) return "";
      return new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(startsAt);
    },
    () => "",
  );
  return local ? <span className="block text-sm text-muted">{local} your time</span> : null;
}

export function DismissibleNote({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(true);
  if (!shown) return null;
  return (
    <div className="card mb-5 flex items-start gap-3 p-4">
      <div className="min-w-0 flex-1">{children}</div>
      <button type="button" className="btn btn-ghost btn-icon btn-sm -mr-2 -mt-1.5" onClick={() => setShown(false)} aria-label="Dismiss">
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
