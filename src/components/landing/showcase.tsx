"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { THEMES, themeVars } from "@/lib/themes";
import { cx } from "@/lib/utils";
import { EventCover } from "../cover/event-cover";
import { AvatarStack } from "../ui/bits";

const DEMOS = [
  { themeId: "punch", emoji: "🎂", host: "Maya", title: "Sam’s surprise 30th", when: "Sat, Mar 14 · 8 PM", where: "The rooftop at ours" },
  { themeId: "disco", emoji: "🪩", host: "Jo & Kit", title: "Housewarming, finally", when: "Fri, Apr 3 · 9 PM", where: "Flat 4, Lemon St" },
  { themeId: "garden", emoji: "💐", host: "Priya", title: "Spring garden lunch", when: "Sun, May 10 · 1 PM", where: "Nana’s back garden" },
  { themeId: "sprinkles", emoji: "🎈", host: "The Okafors", title: "Mia turns six!", when: "Sat, Jun 6 · 11 AM", where: "Jumpzone, Hall B" },
  { themeId: "midnight", emoji: "🥂", host: "Elena", title: "New Year’s at the lake", when: "Thu, Dec 31 · 9 PM", where: "The boathouse" },
  { themeId: "arcade", emoji: "🎲", host: "Dev", title: "Game night IX", when: "Wed, Feb 18 · 7 PM", where: "Dev’s place" },
];

/** A live invite preview that cycles through themes; tap a swatch to pin one. */
export function Showcase() {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const demo = DEMOS[index];
  const theme = THEMES.find((t) => t.id === demo.themeId)!;

  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % DEMOS.length), 3600);
    return () => window.clearInterval(id);
  }, [auto]);

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div
        key={demo.themeId}
        className="theme-scope rotate-2 animate-pop-in overflow-hidden rounded-[30px] border-[3px] border-[#1b1325] shadow-[8px_8px_0_0_#1b1325]"
        style={themeVars(theme)}
        aria-hidden="true"
      >
        <EventCover theme={theme} emoji={demo.emoji} seed={demo.themeId} className="aspect-[4/3]" />
        <div className="p-5">
          <p className="eyebrow">Hosted by {demo.host}</p>
          <p className="display mt-2 text-[2rem]">{demo.title}</p>
          <div className="mt-4 flex flex-col gap-2 text-[0.9375rem] font-bold">
            <p className="flex items-center gap-2.5">
              <CalendarDays size={18} className="shrink-0" /> {demo.when}
            </p>
            <p className="flex items-center gap-2.5">
              <MapPin size={18} className="shrink-0" /> {demo.where}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2.5">
            <AvatarStack names={["Ana B", "Tom K", "Lia M", "Raj P"]} extra={12} size={30} />
            <span className="text-sm font-semibold text-muted">16 going</span>
          </div>
          <div className="mt-4 grid grid-cols-[1.35fr_1fr_1fr] gap-2">
            <span className="btn btn-primary btn-sm px-1">🎉 Going</span>
            <span className="btn btn-sm px-1">Maybe</span>
            <span className="btn btn-sm px-1">Can’t</span>
          </div>
        </div>
      </div>

      <div role="group" aria-label="Preview a theme" className="mt-7 flex justify-center gap-2">
        {DEMOS.map((d, i) => {
          const t = THEMES.find((x) => x.id === d.themeId)!;
          return (
            <button
              key={d.themeId}
              type="button"
              aria-label={`${t.name} theme`}
              aria-pressed={i === index}
              onClick={() => {
                setIndex(i);
                setAuto(false);
              }}
              className={cx(
                "grid size-11 place-items-center rounded-full transition-transform active:scale-90",
              )}
            >
              <span
                className={cx(
                  "block size-7 rounded-full border-2 border-line transition-transform",
                  i === index && "scale-125 shadow-pop-sm",
                )}
                style={{ background: `linear-gradient(135deg, ${t.coverBg} 50%, ${t.accent} 50%)` }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
