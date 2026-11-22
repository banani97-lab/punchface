import "server-only";
import { headers } from "next/headers";
import { connection } from "next/server";

/**
 * Absolute origin for links that leave the app (emails, calendar files).
 * Production must set APP_URL: deriving it from the Host header would let a
 * forged header point sign-in links at someone else’s domain.
 */
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL must be set in production (e.g. https://punchface.example).");
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Origin of the current request, for links rendered back to the same visitor
 * (calendar entries, share links). Never use this for email: see getBaseUrl.
 */
export async function requestOrigin(): Promise<string> {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

// --- Rate limiting ----------------------------------------------------------
// In-memory fixed windows: right for a single server. Swap for a shared store
// (Redis, Upstash) before running more than one instance.

type Bucket = { count: number; resetAt: number };
const buckets = ((globalThis as unknown as { __pfBuckets?: Map<string, Bucket> }).__pfBuckets ??=
  new Map<string, Bucket>());

/** True when the call is allowed; false once `limit` is exceeded within `windowMs`. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

/** Rate limit keyed by action name and caller IP. */
export async function allowAction(action: string, limit: number, windowMs = 60_000): Promise<boolean> {
  if (process.env.PUNCHFACE_DISABLE_RATE_LIMIT === "1") return true;
  return allow(`${action}:${await clientIp()}`, limit, windowMs);
}

/**
 * The current time, for Server Components. `connection()` tells Next.js the
 * value belongs to this request, so it is never baked into a prerendered or
 * prefetched shell.
 */
export async function requestNow(): Promise<number> {
  await connection();
  return Date.now();
}
