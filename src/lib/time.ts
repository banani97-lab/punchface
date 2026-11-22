/**
 * Time helpers. Events store a UTC instant plus the IANA timezone the host
 * created them in, and are always displayed in that timezone so everyone
 * reads the same clock time. Pure functions: safe on server and client.
 */

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string) {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsCache.set(tz, f);
  }
  return f;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

type Wall = { year: number; month: number; day: number; hour: number; minute: number };

/** The wall-clock reading of a UTC instant in a timezone. */
export function wallTime(utcMs: number, tz: string): Wall {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(tz).formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour, minute: out.minute };
}

function offsetMs(utcMs: number, tz: string): number {
  const w = wallTime(utcMs, tz);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  return asUtc - Math.floor(utcMs / 60000) * 60000;
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Converts a `datetime-local` value ("2026-12-12T19:00") in `tz` to UTC ms. */
export function zonedToUtc(local: string, tz: string): number | null {
  const m = LOCAL_RE.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(guess)) return null;
  let utc = guess - offsetMs(guess, tz);
  // Second pass settles times near a daylight-saving change.
  const off2 = offsetMs(utc, tz);
  utc = guess - off2;
  return utc;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Formats a UTC instant as a `datetime-local` value in `tz`. */
export function utcToZonedInput(utcMs: number, tz: string): string {
  const w = wallTime(utcMs, tz);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

function fmt(utcMs: number, tz: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(new Date(utcMs));
}

export function formatDay(utcMs: number, tz: string): string {
  return fmt(utcMs, tz, { weekday: "long", month: "long", day: "numeric" });
}

export function formatDayShort(utcMs: number, tz: string): string {
  return fmt(utcMs, tz, { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(utcMs: number, tz: string): string {
  return fmt(utcMs, tz, { hour: "numeric", minute: "2-digit" }).replace(":00", "");
}

export function tzAbbr(utcMs: number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(
    new Date(utcMs),
  );
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

export function monthAbbr(utcMs: number, tz: string): string {
  return fmt(utcMs, tz, { month: "short" }).toUpperCase();
}

export function dayOfMonth(utcMs: number, tz: string): string {
  return fmt(utcMs, tz, { day: "numeric" });
}

function sameDay(a: number, b: number, tz: string) {
  const x = wallTime(a, tz);
  const y = wallTime(b, tz);
  return x.year === y.year && x.month === y.month && x.day === y.day;
}

/** "7 PM – 11 PM EST" or "7 PM EST"; spans midnight gracefully. */
export function formatTimeRange(startsAt: number, endsAt: number | null, tz: string): string {
  const abbr = tzAbbr(startsAt, tz);
  if (!endsAt) return `${formatTime(startsAt, tz)} ${abbr}`;
  if (sameDay(startsAt, endsAt, tz) || endsAt - startsAt < 18 * 3600_000) {
    return `${formatTime(startsAt, tz)} – ${formatTime(endsAt, tz)} ${abbr}`;
  }
  return `${formatTime(startsAt, tz)} – ${formatDayShort(endsAt, tz)}, ${formatTime(endsAt, tz)} ${abbr}`;
}

/** One-line summary for cards, emails and link previews. */
export function formatWhen(startsAt: number | null, endsAt: number | null, tz: string): string {
  if (!startsAt) return "Date to be decided";
  return `${formatDayShort(startsAt, tz)} · ${formatTimeRange(startsAt, endsAt, tz)}`;
}

/** "Today", "Tomorrow", "In 5 days", "3 weeks ago" relative to `now`. */
export function relativeDay(utcMs: number, tz: string, now: number): string {
  const a = wallTime(utcMs, tz);
  const b = wallTime(now, tz);
  const days = Math.round(
    (Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86_400_000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 14) return `In ${days} days`;
  if (days >= 14 && days < 60) return `In ${Math.round(days / 7)} weeks`;
  if (days >= 60) return `In ${Math.round(days / 30)} months`;
  if (days > -14) return `${-days} days ago`;
  if (days > -60) return `${Math.round(-days / 7)} weeks ago`;
  return `${Math.round(-days / 30)} months ago`;
}

/** "just now", "5m", "3h", "2d", then a date. */
export function timeAgo(utcMs: number, now: number): string {
  const s = Math.max(0, Math.round((now - utcMs) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86_400) return `${Math.round(s / 3600)}h`;
  if (s < 7 * 86_400) return `${Math.round(s / 86_400)}d`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(utcMs));
}
