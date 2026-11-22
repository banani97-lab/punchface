export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const AVATAR_COLORS = [
  "#ff4775", "#ffb703", "#6c4dff", "#00b894", "#3aa8ff", "#ff8a3d", "#e056fd", "#14b8d4",
];

/** Stable colour for a person, so their avatar looks the same everywhere. */
export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Deterministic PRNG so generated cover art matches between server and client. */
export function seededRandom(seed: string): () => number {
  let a = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) a = Math.imul(a ^ seed.charCodeAt(i), 0x85ebca6b) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fields?: Record<string, string> };

export const ok = <T = undefined>(data?: T, message?: string): ActionResult<T> => ({
  ok: true,
  data: data as T,
  message,
});

export const fail = (error: string, fields?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fields,
});
