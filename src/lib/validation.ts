import { z } from "zod";
import { isThemeId } from "./themes";
import { isValidTimeZone } from "./time";

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const trimmed = (max: number) => z.string().trim().max(max);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
    } catch {
      return false;
    }
  }, "That doesn’t look like a link");

/** What the event editor submits. Dates are `datetime-local` strings in `timezone`. */
export const eventInput = z
  .object({
    title: trimmed(80).min(2, "Give it a name (at least 2 characters)"),
    hostName: trimmed(60).min(1, "Who’s hosting?"),
    description: trimmed(4000),
    emoji: z.string().trim().min(1).max(16),
    themeId: z.string().refine(isThemeId, "Unknown theme"),
    dateMode: z.enum(["set", "poll"]),
    startsAtLocal: z.string(),
    endsAtLocal: z.string(),
    pollOptionsLocal: z.array(z.string().regex(LOCAL_DT)).max(6),
    timezone: z.string().refine(isValidTimeZone, "Unknown timezone"),
    locationName: trimmed(120),
    locationAddress: trimmed(240),
    onlineUrl: optionalUrl,
    allowPlusOnes: z.boolean(),
    maxPlusOnes: z.number().int().min(1).max(10),
    capacity: z.number().int().min(1).max(5000).nullable(),
    guestListVisibility: z.enum(["everyone", "guests", "host"]),
    wallEnabled: z.boolean(),
    photosEnabled: z.boolean(),
    bringEnabled: z.boolean(),
    bringItems: z
      .array(z.object({ label: trimmed(80).min(1), quantity: z.number().int().min(1).max(99) }))
      .max(40),
    notifyHost: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.dateMode === "set") {
      if (!LOCAL_DT.test(v.startsAtLocal)) {
        ctx.addIssue({ code: "custom", path: ["startsAtLocal"], message: "Pick a date and time" });
      }
      if (v.endsAtLocal && !LOCAL_DT.test(v.endsAtLocal)) {
        ctx.addIssue({ code: "custom", path: ["endsAtLocal"], message: "Pick a valid end time" });
      }
      if (LOCAL_DT.test(v.startsAtLocal) && LOCAL_DT.test(v.endsAtLocal) && v.endsAtLocal <= v.startsAtLocal) {
        ctx.addIssue({ code: "custom", path: ["endsAtLocal"], message: "The end needs to be after the start" });
      }
    } else if (new Set(v.pollOptionsLocal).size < 2) {
      ctx.addIssue({ code: "custom", path: ["pollOptionsLocal"], message: "Add at least two different dates to vote on" });
    }
  });

export type EventInput = z.infer<typeof eventInput>;

export const rsvpInput = z.object({
  eventId: z.string().min(1),
  status: z.enum(["going", "maybe", "declined"]),
  name: trimmed(60).min(1, "Add your name so the host knows who’s coming"),
  email: z.union([z.literal(""), z.email("That email doesn’t look right").max(254)]),
  plusOnes: z.number().int().min(0).max(10),
  note: trimmed(280),
  pollOptionIds: z.array(z.string()).max(6),
});

export type RsvpInput = z.infer<typeof rsvpInput>;

export const emailSchema = z.email("That email doesn’t look right").max(254);

/** First message per field, keyed by the first path segment. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * Parses pasted guest lists: one per line or comma separated, as
 * "Name <email>", "Name email" or a bare email.
 */
export function parseGuestList(raw: string): Array<{ name: string; email: string }> {
  const seen = new Set<string>();
  const out: Array<{ name: string; email: string }> = [];
  for (const chunk of raw.split(/[\n,;]+/)) {
    const part = chunk.trim();
    if (!part) continue;
    const match = /([^\s<>"']+@[^\s<>"']+\.[^\s<>"']+)/.exec(part);
    if (!match) continue;
    const email = match[1].toLowerCase().replace(/[.,]+$/, "");
    if (!emailSchema.safeParse(email).success || seen.has(email)) continue;
    seen.add(email);
    const name = part
      .replace(match[1], "")
      .replace(/[<>"'()]/g, "")
      .trim();
    out.push({ name: name || prettifyLocalPart(email), email });
  }
  return out;
}

function prettifyLocalPart(email: string): string {
  const local = email.split("@")[0].replace(/\+.*$/, "");
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 60);
}
