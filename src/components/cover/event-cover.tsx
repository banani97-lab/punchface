import { useId } from "react";
import type { Theme } from "@/lib/themes";
import { cx } from "@/lib/utils";
import { PATTERNS } from "./patterns";

type EventCoverProps = {
  theme: Theme;
  emoji: string;
  /** Varies the generated art per event. */
  seed?: string;
  /** An uploaded photo replaces the generated art. */
  imageUrl?: string | null;
  animated?: boolean;
  className?: string;
};

/**
 * The invite’s cover: generated, animated art with the event’s emoji as a
 * sticker, or the host’s own photo. Purely decorative, so hidden from
 * assistive tech; the title lives in real text next to it.
 */
export function EventCover({ theme, emoji, seed = "punchface", imageUrl, animated = true, className }: EventCoverProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const Pattern = PATTERNS[theme.pattern];

  return (
    <div
      className={cx("relative isolate overflow-hidden", className)}
      style={{ background: theme.coverBg, containerType: "size" }}
      aria-hidden="true"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads are already resized and served with immutable caching
        <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" decoding="async" />
      ) : (
        <>
          <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
            <Pattern colors={theme.coverColors} bg={theme.coverBg} seed={seed} uid={uid} animated={animated} />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span
              className={cx("select-none leading-none", animated && "animate-float")}
              style={
                {
                  fontSize: "36cqmin",
                  "--tilt": "-6deg",
                  transform: "rotate(-6deg)",
                  filter: "drop-shadow(0 0.04em 0 rgb(0 0 0 / 0.22)) drop-shadow(0 0.1em 0.12em rgb(0 0 0 / 0.18))",
                } as React.CSSProperties
              }
            >
              {emoji}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
