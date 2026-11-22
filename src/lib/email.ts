import "server-only";
import { db, schema } from "@/db";
import { newId } from "./ids";

/**
 * Email delivery. With RESEND_API_KEY set, messages go out through Resend;
 * without it they are only recorded, and /dev/outbox shows them. Every
 * message is written to the `emails` table either way.
 */

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

const FROM = () => process.env.EMAIL_FROM ?? "punchface <invites@punchface.local>";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: string;
  eventId?: string;
  replyTo?: string;
};

export async function sendEmail(msg: OutgoingEmail): Promise<{ delivered: boolean }> {
  let status: "sent" | "logged" | "failed" = "logged";
  let error: string | null = null;

  if (emailConfigured()) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM(),
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          reply_to: msg.replyTo,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        status = "sent";
      } else {
        status = "failed";
        error = `Resend responded ${res.status}: ${(await res.text()).slice(0, 300)}`;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
    if (status === "failed") console.error(`[email] ${msg.kind} to ${msg.to} failed: ${error}`);
  }

  await db.insert(schema.emails).values({
    id: newId(),
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    kind: msg.kind,
    eventId: msg.eventId ?? null,
    status,
    error,
    createdAt: Date.now(),
  });

  return { delivered: status === "sent" };
}

// --- Templates --------------------------------------------------------------

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Layout = {
  preheader: string;
  emoji?: string;
  heading: string;
  /** Paragraphs of plain text; escaped for you. */
  body: string[];
  facts?: Array<[label: string, value: string]>;
  cta?: { label: string; url: string };
  footer?: string[];
};

function layout(l: Layout): { html: string; text: string } {
  const facts = (l.facts ?? []).filter(([, v]) => v);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(l.heading)}</title></head>
<body style="margin:0;background:#fff6ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1b1325;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(l.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6ea;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:2px solid #1b1325;border-radius:20px;">
<tr><td style="padding:32px 28px 28px;">
${l.emoji ? `<div style="font-size:48px;line-height:1;margin-bottom:16px;">${esc(l.emoji)}</div>` : ""}
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.1;letter-spacing:-0.02em;">${esc(l.heading)}</h1>
${l.body.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;">${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n")}
${
  facts.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;width:100%;background:#fff6ea;border-radius:14px;">
${facts
  .map(
    ([k, v]) =>
      `<tr><td style="padding:10px 14px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#5f5469;width:72px;vertical-align:top;">${esc(k)}</td><td style="padding:10px 14px 10px 0;font-size:16px;font-weight:600;">${esc(v)}</td></tr>`,
  )
  .join("\n")}
</table>`
    : ""
}
${
  l.cta
    ? `<a href="${esc(l.cta.url)}" style="display:inline-block;background:#ff4775;color:#1b1325;font-weight:800;font-size:17px;text-decoration:none;padding:15px 26px;border-radius:14px;border:2px solid #1b1325;">${esc(l.cta.label)}</a>
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#5f5469;">Button not working? Paste this link into your browser:<br><a href="${esc(l.cta.url)}" style="color:#5f5469;word-break:break-all;">${esc(l.cta.url)}</a></p>`
    : ""
}
</td></tr></table>
<p style="max-width:520px;margin:18px auto 0;font-size:12px;line-height:1.5;color:#5f5469;text-align:center;">
${(l.footer ?? []).map(esc).join("<br>")}${l.footer?.length ? "<br>" : ""}Sent with punchface — free invites, no ads.</p>
</td></tr></table></body></html>`;

  const text = [
    l.heading,
    "",
    ...l.body,
    "",
    ...facts.map(([k, v]) => `${k}: ${v}`),
    facts.length ? "" : null,
    l.cta ? `${l.cta.label}: ${l.cta.url}` : null,
    "",
    ...(l.footer ?? []),
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { html, text };
}

type EventFacts = {
  title: string;
  emoji: string;
  hostName: string;
  when: string;
  where: string;
};

const facts = (e: EventFacts): Array<[string, string]> => [
  ["When", e.when],
  ["Where", e.where],
  ["Host", e.hostName],
];

const optOutLine = (url: string) => `Don’t want emails about this event? ${url}`;

export const templates = {
  magicLink(url: string) {
    return {
      subject: "Your punchface sign-in link",
      ...layout({
        preheader: "Tap to sign in. The link works once and expires in 20 minutes.",
        emoji: "👋",
        heading: "Sign in to punchface",
        body: [
          "Tap the button to sign in and keep your invites safe across devices. The link works once and expires in 20 minutes.",
        ],
        cta: { label: "Sign in", url },
        footer: ["If you didn’t ask for this, you can ignore it."],
      }),
    };
  },

  invite(e: EventFacts, guestName: string, url: string, optOutUrl: string) {
    return {
      subject: `${e.emoji} You’re invited: ${e.title}`,
      ...layout({
        preheader: `Hosted by ${e.hostName}. ${e.when}`,
        emoji: e.emoji,
        heading: e.title,
        body: [`Hi ${guestName}, you’re invited! One tap to reply, no account needed.`],
        facts: facts(e),
        cta: { label: "View invite & RSVP", url },
        footer: [optOutLine(optOutUrl)],
      }),
    };
  },

  nudge(e: EventFacts, guestName: string, url: string, optOutUrl: string) {
    return {
      subject: `${e.emoji} Still deciding? ${e.title}`,
      ...layout({
        preheader: `${e.hostName} is finalising numbers.`,
        emoji: "👀",
        heading: `Can you make it, ${guestName}?`,
        body: [`${e.hostName} is sorting out numbers for ${e.title} and hasn’t heard from you yet. A yes, a no or a maybe all help.`],
        facts: facts(e),
        cta: { label: "Reply now", url },
        footer: [optOutLine(optOutUrl)],
      }),
    };
  },

  rsvpConfirmation(e: EventFacts, guestName: string, statusLine: string, url: string, optOutUrl: string) {
    return {
      subject: `${e.emoji} ${statusLine}: ${e.title}`,
      ...layout({
        preheader: "Keep this email to change your reply later.",
        emoji: e.emoji,
        heading: `${statusLine}, ${guestName}`,
        body: [
          `Your reply to ${e.title} is saved. Plans change, so this link lets you update it from any device.`,
        ],
        facts: facts(e),
        cta: { label: "View invite or change reply", url },
        footer: [optOutLine(optOutUrl)],
      }),
    };
  },

  reminder(e: EventFacts, guestName: string, url: string, optOutUrl: string) {
    return {
      subject: `${e.emoji} Coming up: ${e.title}`,
      ...layout({
        preheader: e.when,
        emoji: "⏰",
        heading: `${e.title} is almost here`,
        body: [`Hi ${guestName}, a quick reminder so it doesn’t sneak up on you.`],
        facts: facts(e),
        cta: { label: "View invite", url },
        footer: [optOutLine(optOutUrl)],
      }),
    };
  },

  update(e: EventFacts, message: string, url: string, optOutUrl: string) {
    return {
      subject: `${e.emoji} Update from ${e.hostName}: ${e.title}`,
      ...layout({
        preheader: message.slice(0, 120),
        emoji: "📣",
        heading: `Update: ${e.title}`,
        body: [`${e.hostName} wrote:`, message],
        facts: facts(e),
        cta: { label: "View invite", url },
        footer: [optOutLine(optOutUrl)],
      }),
    };
  },

  cancelled(e: EventFacts, url: string, optOutUrl: string) {
    return {
      subject: `Cancelled: ${e.title}`,
      ...layout({
        preheader: `${e.hostName} cancelled this event.`,
        emoji: "🫶",
        heading: `${e.title} is cancelled`,
        body: [`${e.hostName} has cancelled this event. Nothing you need to do.`],
        cta: { label: "View details", url },
        footer: [optOutLine(optOutUrl)],
      }),
    };
  },

  hostRsvp(e: EventFacts, guestName: string, statusLine: string, note: string, url: string) {
    return {
      subject: `${guestName} ${statusLine} — ${e.title}`,
      ...layout({
        preheader: note || `New reply for ${e.title}.`,
        emoji: e.emoji,
        heading: `${guestName} ${statusLine}`,
        body: note ? [`They added a note:`, `“${note}”`] : [`A new reply just came in for ${e.title}.`],
        cta: { label: "Open guest list", url },
        footer: ["You get these because reply notifications are on for this event. Turn them off in the event’s settings."],
      }),
    };
  },
};
