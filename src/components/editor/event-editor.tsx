"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Camera,
  Eye,
  ImagePlus,
  MapPin,
  MessagesSquare,
  Plus,
  ShoppingBasket,
  Sparkles,
  Trash2,
  Users,
  UserPlus,
  Bell,
  X,
} from "lucide-react";
import { draftInviteAction } from "@/actions/ai";
import { removeCover, saveEvent } from "@/actions/events";
import { EMOJI_CHOICES, OCCASIONS, THEMES, getTheme, themeVars } from "@/lib/themes";
import { cx } from "@/lib/utils";
import { EventCover } from "../cover/event-cover";
import { Spinner, Toggle } from "../ui/bits";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

export type EditorState = {
  title: string;
  hostName: string;
  description: string;
  emoji: string;
  themeId: string;
  dateMode: "set" | "poll";
  startsAtLocal: string;
  endsAtLocal: string;
  pollOptionsLocal: string[];
  timezone: string;
  locationName: string;
  locationAddress: string;
  onlineUrl: string;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  capacity: number | null;
  guestListVisibility: "everyone" | "guests" | "host";
  wallEnabled: boolean;
  photosEnabled: boolean;
  bringEnabled: boolean;
  bringItems: Array<{ id?: string; label: string; quantity: number }>;
  notifyHost: boolean;
};

const DRAFT_KEY = "punchface:draft:v1";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Next Saturday at 7pm: a sensible default most parties only nudge. */
function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  d.setHours(19, 0, 0, 0);
  return toLocalInput(d);
}

export function blankEditorState(hostName: string): EditorState {
  return {
    title: "",
    hostName,
    description: "",
    emoji: "🎉",
    themeId: "punch",
    dateMode: "set",
    startsAtLocal: defaultStart(),
    endsAtLocal: "",
    pollOptionsLocal: [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    locationName: "",
    locationAddress: "",
    onlineUrl: "",
    allowPlusOnes: true,
    maxPlusOnes: 2,
    capacity: null,
    guestListVisibility: "guests",
    wallEnabled: true,
    photosEnabled: true,
    bringEnabled: false,
    bringItems: [],
    notifyHost: true,
  };
}

function loadDraft(hostName: string): EditorState {
  const blank = blankEditorState(hostName);
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return blank;
    const saved = JSON.parse(raw) as Partial<EditorState>;
    const merged = { ...blank, ...saved, timezone: blank.timezone };
    // A draft left for weeks shouldn’t open with a date in the past.
    if (merged.startsAtLocal < toLocalInput(new Date())) merged.startsAtLocal = blank.startsAtLocal;
    merged.pollOptionsLocal = (merged.pollOptionsLocal ?? []).filter((v) => v >= toLocalInput(new Date()));
    return merged;
  } catch {
    return blank;
  }
}

type Props =
  | { mode: "create"; hostName: string; aiEnabled: boolean }
  | { mode: "edit"; eventId: string; slug: string; initial: EditorState; coverUrl: string | null; aiEnabled: boolean };

export function EventEditor(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<EditorState>(() =>
    props.mode === "edit" ? props.initial : loadDraft(props.hostName),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [drafting, startDrafting] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [showEnd, setShowEnd] = useState(Boolean(state.endsAtLocal));
  const [limitOn, setLimitOn] = useState(state.capacity !== null);
  const formRef = useRef<HTMLFormElement>(null);

  const theme = getTheme(state.themeId);
  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  };

  // Keep an unfinished invite across refreshes and accidental back-swipes.
  useEffect(() => {
    if (props.mode !== "create") return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
      } catch {
        // Private mode or full storage: drafts just won’t persist.
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [state, props.mode]);

  const fileUrl = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile]);
  useEffect(() => () => void (fileUrl && URL.revokeObjectURL(fileUrl)), [fileUrl]);
  const savedCover = props.mode === "edit" && !coverRemoved ? props.coverUrl : null;
  const coverPreview = fileUrl ?? savedCover;

  function applyOccasion(id: string) {
    const o = OCCASIONS.find((x) => x.id === id);
    if (!o) return;
    setState((s) => ({
      ...s,
      emoji: o.emoji,
      themeId: o.themeId,
      bringEnabled: Boolean(o.bring?.length) || s.bringEnabled,
      bringItems: o.bring?.length && s.bringItems.length === 0 ? o.bring.map((label) => ({ label, quantity: 1 })) : s.bringItems,
    }));
  }

  function draft() {
    startDrafting(async () => {
      const result = await draftInviteAction(prompt);
      if (!result.ok) return toast.error(result.error);
      const d = result.data;
      setState((s) => ({
        ...s,
        title: d.title || s.title,
        description: d.description || s.description,
        emoji: d.emoji || s.emoji,
        themeId: d.themeId,
        bringEnabled: d.bringItems.length > 0 || s.bringEnabled,
        bringItems: d.bringItems.length > 0 ? d.bringItems.map((label) => ({ label, quantity: 1 })) : s.bringItems,
      }));
      setErrors({});
      toast.success(d.source === "ai" ? "Drafted! Tweak anything you like." : "Filled in a starting point. Make it yours.");
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...state,
      endsAtLocal: showEnd && state.dateMode === "set" ? state.endsAtLocal : "",
      capacity: limitOn ? state.capacity : null,
      pollOptionsLocal: state.dateMode === "poll" ? state.pollOptionsLocal.filter(Boolean) : [],
      bringItems: state.bringEnabled ? state.bringItems.filter((i) => i.label.trim()) : [],
    };
    startSaving(async () => {
      const result = await saveEvent(props.mode === "edit" ? props.eventId : null, payload);
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error(result.error);
        const first = Object.keys(result.fields ?? {})[0];
        if (first) formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.scrollIntoView({ block: "center" });
        return;
      }
      if (coverFile) {
        const form = new FormData();
        form.set("file", coverFile);
        const res = await fetch(`/api/events/${result.data.id}/cover`, { method: "POST", body: form });
        if (!res.ok) toast.error("Invite saved, but the cover photo didn’t upload. Try again from Edit.");
      }
      if (props.mode === "create") {
        try {
          window.localStorage.removeItem(DRAFT_KEY);
        } catch {}
        router.push(`/e/${result.data.slug}/manage?created=1`);
      } else {
        toast.success("Changes saved.");
        router.push(`/e/${result.data.slug}/manage`);
      }
    });
  }

  const err = (key: string) =>
    errors[key] ? (
      <p id={`${key}-error`} className="field-error">
        {errors[key]}
      </p>
    ) : null;
  const aria = (key: string) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  const nowLocal = toLocalInput(new Date());

  const previewCard = (
    <div className="theme-scope overflow-hidden rounded-[28px] border-2 border-[#1b1325]" style={themeVars(theme)}>
      <EventCover theme={theme} emoji={state.emoji} imageUrl={coverPreview} seed={state.themeId} className="aspect-[4/3]" />
      <div className="p-5">
        <p className="eyebrow">{state.hostName ? `You’re invited · Hosted by ${state.hostName}` : "You’re invited"}</p>
        <p className="display mt-2 text-[2.25rem] [overflow-wrap:anywhere]">{state.title || "Your party name"}</p>
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="card flex items-center gap-3 p-3">
            <CalendarDays size={20} className="shrink-0" aria-hidden="true" />
            <span className="font-bold">
              {state.dateMode === "poll" ? "Date to be decided" : formatLocalPreview(state.startsAtLocal) || "Pick a date"}
            </span>
          </div>
          {state.locationName || state.locationAddress ? (
            <div className="card flex items-center gap-3 p-3">
              <MapPin size={20} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate font-bold">{state.locationName || state.locationAddress}</span>
            </div>
          ) : null}
        </div>
        {state.description ? <p className="mt-4 line-clamp-4 whitespace-pre-line text-[0.9375rem]">{state.description}</p> : null}
        <div className="mt-5 grid grid-cols-[1.35fr_1fr_1fr] gap-2" aria-hidden="true">
          <span className="btn btn-primary px-2">🎉 Going</span>
          <span className="btn px-2">Maybe</span>
          <span className="btn px-2">Can’t</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-32 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-16">
      <form ref={formRef} onSubmit={submit} noValidate className="flex min-w-0 max-w-2xl flex-col gap-8">
        <header>
          <h1 className="display text-[clamp(2.25rem,1.6rem+3vw,3.25rem)]">
            {props.mode === "create" ? "Let’s make an invite" : "Edit invite"}
          </h1>
          {props.mode === "create" ? (
            <p className="mt-2 text-muted">Two minutes, tops. No account needed, and your draft saves as you type.</p>
          ) : null}
        </header>

        {props.mode === "create" ? (
          <section className="card p-4 sm:p-5" aria-labelledby="quick-start">
            <h2 id="quick-start" className="flex items-center gap-2 text-lg font-extrabold">
              <Sparkles size={20} aria-hidden="true" />
              {props.aiEnabled ? "Describe it, and I’ll write the invite" : "Quick start"}
            </h2>
            <label htmlFor="ai-prompt" className="sr-only">Describe your event</label>
            <textarea
              id="ai-prompt"
              className="input mt-3 !min-h-[84px]"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={600}
              placeholder="Surprise 30th for my sister Maya. Rooftop, tacos, bring your worst dance moves."
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-ink" onClick={draft} disabled={drafting || prompt.trim().length < 8}>
                {drafting ? <Spinner /> : <Sparkles size={18} aria-hidden="true" />}
                {drafting ? "Writing…" : props.aiEnabled ? "Write it for me" : "Fill it in"}
              </button>
              <span className="text-sm text-muted">or pick a starting point:</span>
            </div>
            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
              {OCCASIONS.map((o) => (
                <button key={o.id} type="button" className="chip min-h-10 shrink-0" onClick={() => applyOccasion(o.id)}>
                  <span aria-hidden="true">{o.emoji}</span> {o.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="look" className="flex flex-col gap-4">
          <h2 id="look" className="display text-[1.625rem]">The look</h2>
          <div className="relative lg:hidden">
            <EventCover
              theme={theme}
              emoji={state.emoji}
              imageUrl={coverPreview}
              seed={state.themeId}
              className="aspect-[16/10] rounded-[20px] border-2 border-line shadow-pop"
            />
          </div>

          <div role="radiogroup" aria-label="Theme" className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 pt-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
            {THEMES.map((t) => {
              const selected = t.id === state.themeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => set("themeId", t.id)}
                  className="group w-[104px] shrink-0 snap-start text-left lg:w-auto"
                >
                  <EventCover
                    theme={t}
                    emoji={state.emoji}
                    seed={t.id}
                    animated={false}
                    className={cx(
                      "aspect-[4/3] rounded-2xl border-2 border-line transition-transform duration-150 group-active:scale-95",
                      selected ? "shadow-pop-sm ring-[3px] ring-accent ring-offset-2 ring-offset-bg" : "opacity-90",
                    )}
                  />
                  <span className={cx("mt-1.5 block truncate text-sm", selected ? "font-extrabold" : "font-semibold text-muted")}>
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <p className="field-label" id="emoji-label">Emoji</p>
            <div role="radiogroup" aria-labelledby="emoji-label" className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  role="radio"
                  aria-checked={state.emoji === emoji}
                  aria-label={emoji}
                  onClick={() => set("emoji", emoji)}
                  className={cx(
                    "grid size-12 place-items-center rounded-xl border-2 text-2xl transition-transform active:scale-90",
                    state.emoji === emoji ? "border-line bg-accent-2 shadow-pop-sm" : "border-transparent hover:bg-fg/5",
                  )}
                >
                  {emoji}
                </button>
              ))}
              <label className="flex h-12 items-center gap-2 rounded-xl border-2 border-dashed border-line/40 px-3 text-sm font-semibold text-muted">
                Other
                <input
                  className="w-12 bg-transparent text-center text-2xl text-fg outline-none"
                  value={EMOJI_CHOICES.includes(state.emoji) ? "" : state.emoji}
                  onChange={(e) => set("emoji", Array.from(e.target.value.trim()).slice(-2).join("") || "🎉")}
                  aria-label="Custom emoji"
                  placeholder="🙂"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="btn btn-sm has-[:focus-visible]:outline">
              <ImagePlus size={16} aria-hidden="true" />
              {coverPreview ? "Change cover photo" : "Use your own photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 12 * 1024 * 1024) return toast.error("That photo is over 12 MB. Pick a smaller one.");
                  setCoverFile(file);
                }}
              />
            </label>
            {coverPreview ? (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setCoverFile(null);
                  setCoverRemoved(true);
                  if (props.mode === "edit" && props.coverUrl) void removeCover(props.eventId);
                }}
              >
                <X size={16} aria-hidden="true" /> Remove photo
              </button>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="basics" className="flex flex-col gap-4">
          <h2 id="basics" className="display text-[1.625rem]">The basics</h2>
          <div data-field="title">
            <label htmlFor="title" className="field-label">What’s it called?</label>
            <input
              id="title"
              className="input !text-lg font-bold"
              value={state.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={80}
              placeholder="Sam’s 30th"
              autoComplete="off"
              enterKeyHint="next"
              required
              {...aria("title")}
            />
            {err("title")}
          </div>
          <div data-field="hostName">
            <label htmlFor="hostName" className="field-label">Hosted by</label>
            <input
              id="hostName"
              className="input"
              value={state.hostName}
              onChange={(e) => set("hostName", e.target.value)}
              maxLength={60}
              placeholder="Your name (or names)"
              autoComplete="name"
              autoCapitalize="words"
              required
              {...aria("hostName")}
            />
            {err("hostName")}
          </div>
        </section>

        <section aria-labelledby="when" className="flex flex-col gap-4">
          <h2 id="when" className="display text-[1.625rem]">When</h2>
          <div role="radiogroup" aria-label="How is the date decided?" className="grid grid-cols-2 gap-2">
            {(
              [
                ["set", "I know the date"],
                ["poll", "Let guests vote"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={state.dateMode === mode}
                className={cx("btn", state.dateMode === mode && "btn-ink")}
                onClick={() => {
                  set("dateMode", mode);
                  if (mode === "poll" && state.pollOptionsLocal.length === 0) {
                    const next = new Date(state.startsAtLocal || defaultStart());
                    next.setDate(next.getDate() + 7);
                    set("pollOptionsLocal", [state.startsAtLocal || defaultStart(), toLocalInput(next)]);
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {state.dateMode === "set" ? (
            <>
              <div data-field="startsAtLocal">
                <label htmlFor="startsAt" className="field-label">Starts</label>
                <input
                  id="startsAt"
                  type="datetime-local"
                  className="input"
                  value={state.startsAtLocal}
                  min={props.mode === "create" ? nowLocal : undefined}
                  onChange={(e) => set("startsAtLocal", e.target.value)}
                  required
                  {...aria("startsAtLocal")}
                />
                {err("startsAtLocal")}
              </div>
              {showEnd ? (
                <div data-field="endsAtLocal">
                  <div className="flex items-center justify-between">
                    <label htmlFor="endsAt" className="field-label">Ends</label>
                    <button
                      type="button"
                      className="linkish mb-1.5 text-sm"
                      onClick={() => {
                        setShowEnd(false);
                        set("endsAtLocal", "");
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    id="endsAt"
                    type="datetime-local"
                    className="input"
                    value={state.endsAtLocal}
                    min={state.startsAtLocal}
                    onChange={(e) => set("endsAtLocal", e.target.value)}
                    {...aria("endsAtLocal")}
                  />
                  {err("endsAtLocal")}
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm self-start"
                  onClick={() => {
                    setShowEnd(true);
                    if (state.startsAtLocal) {
                      const end = new Date(state.startsAtLocal);
                      end.setHours(end.getHours() + 3);
                      set("endsAtLocal", toLocalInput(end));
                    }
                  }}
                >
                  <Plus size={16} aria-hidden="true" /> Add an end time
                </button>
              )}
            </>
          ) : (
            <div data-field="pollOptionsLocal" className="flex flex-col gap-2.5">
              <p className="text-[0.9375rem] text-muted">
                Add the dates you’re considering. Guests tick the ones they can do, and you lock in the winner.
              </p>
              {state.pollOptionsLocal.map((value, i) => (
                <div key={i} className="flex gap-2">
                  <label htmlFor={`poll-${i}`} className="sr-only">Date option {i + 1}</label>
                  <input
                    id={`poll-${i}`}
                    type="datetime-local"
                    className="input min-w-0 flex-1"
                    value={value}
                    min={nowLocal}
                    onChange={(e) => set("pollOptionsLocal", state.pollOptionsLocal.map((v, j) => (j === i ? e.target.value : v)))}
                  />
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() => set("pollOptionsLocal", state.pollOptionsLocal.filter((_, j) => j !== i))}
                    aria-label={`Remove date option ${i + 1}`}
                    disabled={state.pollOptionsLocal.length <= 2}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {state.pollOptionsLocal.length < 6 ? (
                <button
                  type="button"
                  className="btn btn-sm self-start"
                  onClick={() => {
                    const last = state.pollOptionsLocal.at(-1) || defaultStart();
                    const next = new Date(last);
                    next.setDate(next.getDate() + 1);
                    set("pollOptionsLocal", [...state.pollOptionsLocal, toLocalInput(next)]);
                  }}
                >
                  <Plus size={16} aria-hidden="true" /> Add another date
                </button>
              ) : null}
              {err("pollOptionsLocal")}
            </div>
          )}
          <p className="-mt-1 text-sm text-muted">Times are in {state.timezone.replace(/_/g, " ")}.</p>
        </section>

        <section aria-labelledby="where" className="flex flex-col gap-4">
          <h2 id="where" className="display text-[1.625rem]">Where</h2>
          <div data-field="locationName">
            <label htmlFor="locationName" className="field-label">
              Place <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="locationName"
              className="input"
              value={state.locationName}
              onChange={(e) => set("locationName", e.target.value)}
              maxLength={120}
              placeholder="Our place, The Anchor, Riverside Park…"
              autoComplete="off"
            />
          </div>
          <div data-field="locationAddress">
            <label htmlFor="locationAddress" className="field-label">
              Address <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="locationAddress"
              className="input"
              value={state.locationAddress}
              onChange={(e) => set("locationAddress", e.target.value)}
              maxLength={240}
              placeholder="12 Lemon St, Apt 4"
              autoComplete="street-address"
            />
            <p className="field-hint">Guests get a one-tap maps link.</p>
          </div>
          <div data-field="onlineUrl">
            <label htmlFor="onlineUrl" className="field-label">
              Video call link <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="onlineUrl"
              type="url"
              inputMode="url"
              className="input"
              value={state.onlineUrl}
              onChange={(e) => set("onlineUrl", e.target.value)}
              maxLength={500}
              placeholder="https://meet.example.com/abc"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              {...aria("onlineUrl")}
            />
            {err("onlineUrl")}
          </div>
        </section>

        <section aria-labelledby="details" className="flex flex-col gap-4">
          <h2 id="details" className="display text-[1.625rem]">The details</h2>
          <div data-field="description">
            <label htmlFor="description" className="field-label">
              What should guests know? <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="description"
              className="input !min-h-[140px]"
              value={state.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={4000}
              placeholder="Dress code, parking, what’s for dinner, whether to bring the dog…"
            />
          </div>
        </section>

        <section aria-labelledby="options" className="flex flex-col gap-1">
          <h2 id="options" className="display mb-2 text-[1.625rem]">Guest options</h2>
          <div className="card divide-y-[length:var(--border-w)] divide-line/15 px-4">
            <div>
              <Toggle
                icon={<UserPlus size={20} aria-hidden="true" />}
                label="Plus-ones"
                hint="Guests can say how many people they’re bringing"
                checked={state.allowPlusOnes}
                onChange={(v) => set("allowPlusOnes", v)}
              />
              {state.allowPlusOnes ? (
                <div className="flex items-center justify-between gap-3 pb-3 pl-8">
                  <label htmlFor="maxPlusOnes" className="text-[0.9375rem] font-semibold">Most extras per guest</label>
                  <select
                    id="maxPlusOnes"
                    className="input !min-h-11 !w-24 !py-1.5"
                    value={state.maxPlusOnes}
                    onChange={(e) => set("maxPlusOnes", Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div data-field="capacity">
              <Toggle
                icon={<Users size={20} aria-hidden="true" />}
                label="Limit the headcount"
                hint="Extra replies join a waitlist and move up automatically"
                checked={limitOn}
                onChange={(v) => {
                  setLimitOn(v);
                  if (v && !state.capacity) set("capacity", 20);
                }}
              />
              {limitOn ? (
                <div className="flex items-center justify-between gap-3 pb-3 pl-8">
                  <label htmlFor="capacity" className="text-[0.9375rem] font-semibold">Spots</label>
                  <input
                    id="capacity"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={5000}
                    className="input !min-h-11 !w-24 !py-1.5"
                    value={state.capacity ?? ""}
                    onChange={(e) => set("capacity", e.target.value ? Math.max(1, Math.min(5000, Number(e.target.value))) : null)}
                    {...aria("capacity")}
                  />
                </div>
              ) : null}
              {err("capacity")}
            </div>

            <div>
              <Toggle
                icon={<ShoppingBasket size={20} aria-hidden="true" />}
                label="Bring list"
                hint="A sign-up list so you don’t end up with nine bags of chips"
                checked={state.bringEnabled}
                onChange={(v) => {
                  set("bringEnabled", v);
                  if (v && state.bringItems.length === 0) set("bringItems", [{ label: "", quantity: 1 }]);
                }}
              />
              {state.bringEnabled ? (
                <div className="flex flex-col gap-2 pb-3 pl-8" data-field="bringItems">
                  {state.bringItems.map((item, i) => (
                    <div key={item.id ?? `new-${i}`} className="flex gap-2">
                      <label htmlFor={`bring-${i}`} className="sr-only">Item {i + 1}</label>
                      <input
                        id={`bring-${i}`}
                        className="input !min-h-11 min-w-0 flex-1 !py-1.5"
                        value={item.label}
                        onChange={(e) =>
                          set("bringItems", state.bringItems.map((it, j) => (j === i ? { ...it, label: e.target.value } : it)))
                        }
                        maxLength={80}
                        placeholder="Ice, drinks, dessert…"
                      />
                      <label htmlFor={`bring-qty-${i}`} className="sr-only">How many of item {i + 1}</label>
                      <select
                        id={`bring-qty-${i}`}
                        className="input !min-h-11 !w-[72px] !py-1.5"
                        value={item.quantity}
                        onChange={(e) =>
                          set("bringItems", state.bringItems.map((it, j) => (j === i ? { ...it, quantity: Number(e.target.value) } : it)))
                        }
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                          <option key={n} value={n}>×{n}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-icon btn-sm !h-11 !w-11"
                        onClick={() => set("bringItems", state.bringItems.filter((_, j) => j !== i))}
                        aria-label={`Remove item ${i + 1}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {state.bringItems.length < 40 ? (
                    <button
                      type="button"
                      className="btn btn-sm self-start"
                      onClick={() => set("bringItems", [...state.bringItems, { label: "", quantity: 1 }])}
                    >
                      <Plus size={16} aria-hidden="true" /> Add item
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <Toggle
              icon={<MessagesSquare size={20} aria-hidden="true" />}
              label="Guest wall"
              hint="Comments and reactions on the invite"
              checked={state.wallEnabled}
              onChange={(v) => set("wallEnabled", v)}
            />
            <Toggle
              icon={<Camera size={20} aria-hidden="true" />}
              label="Shared photo album"
              hint="Guests can add photos before, during and after"
              checked={state.photosEnabled}
              onChange={(v) => set("photosEnabled", v)}
            />
            <Toggle
              icon={<Bell size={20} aria-hidden="true" />}
              label="Email me new replies"
              hint="Needs a saved email on your account"
              checked={state.notifyHost}
              onChange={(v) => set("notifyHost", v)}
            />

            <div className="py-3">
              <label htmlFor="visibility" className="flex items-center gap-3 font-bold">
                <Eye size={20} className="shrink-0 text-muted" aria-hidden="true" /> Who can see the guest list?
              </label>
              <select
                id="visibility"
                className="input mt-2"
                value={state.guestListVisibility}
                onChange={(e) => set("guestListVisibility", e.target.value as EditorState["guestListVisibility"])}
              >
                <option value="guests">Guests who’ve replied</option>
                <option value="everyone">Anyone with the link</option>
                <option value="host">Only me</option>
              </select>
            </div>
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-bg px-4 pt-3 safe-bottom lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-2xl gap-2.5">
            <button type="button" className="btn lg:hidden" onClick={() => setPreview(true)}>
              <Eye size={18} aria-hidden="true" /> Preview
            </button>
            <button type="submit" className="btn btn-primary btn-lg min-h-12 flex-1 lg:min-h-14 lg:flex-none" disabled={saving}>
              {saving ? <Spinner /> : null}
              {saving ? "Saving…" : props.mode === "create" ? "Create invite" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      <aside className="hidden lg:block" aria-label="Preview">
        <div className="sticky top-6">
          <p className="eyebrow mb-3">What guests see</p>
          {previewCard}
        </div>
      </aside>

      <Sheet open={preview} onClose={() => setPreview(false)} title="Preview" description="Roughly what your guests will see.">
        <div className="pb-2">{previewCard}</div>
      </Sheet>
    </div>
  );
}

function formatLocalPreview(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
