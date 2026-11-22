type IcsEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: number;
  endsAt: number | null;
  location: string;
  url: string;
  cancelled?: boolean;
  updatedAt: number;
};

const stamp = (ms: number) =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

const escapeText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 wants lines folded at 75 octets. */
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, "utf8");
    if (bytes + size > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

const DEFAULT_DURATION_MS = 3 * 3600_000;

export function buildIcs(e: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//punchface//invites//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.id}@punchface`,
    `DTSTAMP:${stamp(e.updatedAt)}`,
    `DTSTART:${stamp(e.startsAt)}`,
    `DTEND:${stamp(e.endsAt ?? e.startsAt + DEFAULT_DURATION_MS)}`,
    `SUMMARY:${escapeText(e.title)}`,
    `DESCRIPTION:${escapeText([e.description, e.url].filter(Boolean).join("\n\n"))}`,
    e.location ? `LOCATION:${escapeText(e.location)}` : "",
    `URL:${e.url}`,
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(e: IcsEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.startsAt)}/${stamp(e.endsAt ?? e.startsAt + DEFAULT_DURATION_MS)}`,
    details: [e.description, e.url].filter(Boolean).join("\n\n"),
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookCalendarUrl(e: IcsEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: new Date(e.startsAt).toISOString(),
    enddt: new Date(e.endsAt ?? e.startsAt + DEFAULT_DURATION_MS).toISOString(),
    body: [e.description, e.url].filter(Boolean).join("\n\n"),
    location: e.location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}
