import { ImageResponse } from "next/og";
import { getEventBySlug } from "@/lib/data";
import { getTheme } from "@/lib/themes";
import { formatWhen } from "@/lib/time";

export const alt = "Invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The image renderer fetches emoji artwork from a CDN; text-only keeps link
// previews working on servers without outbound network access.
const plain = (s: string) => s.replace(/[\p{Extended_Pictographic}️‍]/gu, "").replace(/\s+/g, " ").trim();

/** The card shown when an invite link is pasted into a chat. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  const theme = getTheme(event?.themeId);
  const title = plain(event?.title ?? "You’re invited") || "You’re invited";
  const when = event ? formatWhen(event.startsAt, event.endsAt, event.timezone) : "";
  const where = event ? plain(event.locationName || event.locationAddress) : "";
  const [c0, c1 = c0, c2 = c1] = theme.coverColors;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: theme.bg,
          color: theme.fg,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", right: -120, top: -140, width: 460, height: 460, borderRadius: 460, background: c0, display: "flex" }} />
        <div style={{ position: "absolute", right: 150, top: 210, width: 150, height: 150, borderRadius: 150, background: c1, display: "flex" }} />
        <div style={{ position: "absolute", right: 60, bottom: -70, width: 240, height: 240, borderRadius: 48, background: c2, transform: "rotate(18deg)", display: "flex" }} />

        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: theme.muted }}>
          {event ? `You’re invited · Hosted by ${plain(event.hostName)}` : "punchface"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 860 }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 34 ? 76 : title.length > 18 ? 96 : 124,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -3,
            }}
          >
            {title}
          </div>
          {when ? <div style={{ display: "flex", marginTop: 28, fontSize: 40, fontWeight: 700 }}>{when}</div> : null}
          {where ? <div style={{ display: "flex", marginTop: 8, fontSize: 34, color: theme.muted }}>{where}</div> : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              padding: "18px 34px",
              borderRadius: 20,
              border: `4px solid ${theme.fg}`,
              background: theme.accent,
              color: theme.accentFg,
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            Tap to reply
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: theme.muted }}>punchface</div>
        </div>
      </div>
    ),
    size,
  );
}
