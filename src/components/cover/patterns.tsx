import type { ReactNode } from "react";
import type { PatternKind } from "@/lib/themes";
import { seededRandom } from "@/lib/utils";

/**
 * Generated cover art. Every pattern draws into a 400×400 SVG that is
 * cropped to fill whatever shape the cover takes, and everything random
 * comes from a seeded generator so server and client render the same art.
 */

type PatternProps = { colors: string[]; bg: string; seed: string; uid: string; animated: boolean };

const pick = <T,>(list: T[], r: () => number) => list[Math.floor(r() * list.length)];
const anim = (animated: boolean, cls: string) => (animated ? cls : undefined);
// Rounded output: trig results can differ in the last digits between the
// server's and the browser's JavaScript engines, which would break hydration.
const px = (n: number) => n.toFixed(1);

function Rays({ colors, animated }: PatternProps) {
  const wedges: ReactNode[] = [];
  const count = 18;
  for (let i = 0; i < count; i += 2) {
    const a0 = (i / count) * Math.PI * 2;
    const a1 = ((i + 1) / count) * Math.PI * 2;
    const R = 520;
    wedges.push(
      <path
        key={i}
        d={`M200 215 L${px(200 + Math.cos(a0) * R)} ${px(215 + Math.sin(a0) * R)} L${px(200 + Math.cos(a1) * R)} ${px(215 + Math.sin(a1) * R)}Z`}
        fill={colors[i % 4 === 0 ? 0 : 1]}
        opacity={i % 4 === 0 ? 1 : 0.9}
      />,
    );
  }
  return (
    <>
      <g className={anim(animated, "animate-spin-slow")} style={{ transformOrigin: "200px 215px" }}>
        {wedges}
      </g>
      <circle cx="200" cy="215" r="118" fill={colors[2]} opacity="0.22" />
    </>
  );
}

function Confetti({ colors, seed, animated }: PatternProps) {
  const r = seededRandom(seed + "confetti");
  const pieces = Array.from({ length: 64 }, (_, i) => {
    const x = r() * 400;
    const y = r() * 400;
    const rot = r() * 360;
    const s = 0.7 + r() * 1.1;
    const fill = colors[i % colors.length];
    const kind = i % 4;
    const cls = anim(animated && i % 6 === 0, "animate-twinkle");
    const style = { animationDelay: `${(r() * 3).toFixed(2)}s` };
    const transform = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${s.toFixed(2)})`;
    if (kind === 0) return <rect key={i} x="-9" y="-3.500" width="18" height="7" rx="2" fill={fill} transform={transform} className={cls} style={style} />;
    if (kind === 1) return <circle key={i} r="5" fill={fill} transform={transform} className={cls} style={style} />;
    if (kind === 2)
      return (
        <path key={i} d="M-11 0c3-6 6 6 9 0s6 6 9 0" fill="none" stroke={fill} strokeWidth="3.500" strokeLinecap="round" transform={transform} className={cls} style={style} />
      );
    return <path key={i} d="M0-7 7 6H-7Z" fill={fill} transform={transform} className={cls} style={style} />;
  });
  return <>{pieces}</>;
}

function Disco({ colors, seed, uid, animated }: PatternProps) {
  const r = seededRandom(seed + "disco");
  const dots: ReactNode[] = [];
  const n = 13;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = r();
      dots.push(
        <rect
          key={`${x}-${y}`}
          x={x * 31 + 2}
          y={y * 31 + 2}
          width="25"
          height="25"
          rx="6"
          fill={pick(colors, r)}
          opacity={(0.12 + v * 0.75).toFixed(2)}
          className={anim(animated && v > 0.72, "animate-twinkle")}
          style={{ animationDelay: `${(r() * 3).toFixed(2)}s` }}
        />,
      );
    }
  }
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="48%" r="60%">
          <stop offset="0" stopColor={colors[0]} stopOpacity="0.55" />
          <stop offset="1" stopColor={colors[0]} stopOpacity="0" />
        </radialGradient>
      </defs>
      {dots}
      <rect width="400" height="400" fill={`url(#${uid}-glow)`} />
    </>
  );
}

function Blobs({ colors, seed, uid, animated }: PatternProps) {
  const r = seededRandom(seed + "blobs");
  return (
    <>
      <defs>
        <filter id={`${uid}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="38" />
        </filter>
      </defs>
      <g filter={`url(#${uid}-blur)`}>
        {colors.concat(colors[0]).map((c, i) => (
          <circle
            key={i}
            cx={(40 + r() * 320).toFixed(0)}
            cy={(40 + r() * 320).toFixed(0)}
            r={(95 + r() * 70).toFixed(0)}
            fill={c}
            className={anim(animated, "animate-drift")}
            style={{ animationDelay: `${(-r() * 18).toFixed(1)}s`, transformOrigin: "200px 200px" }}
          />
        ))}
      </g>
    </>
  );
}

function Florals({ colors, seed }: PatternProps) {
  const r = seededRandom(seed + "florals");
  const leaf = colors[colors.length - 1];
  const petals = colors.slice(0, -1);
  const flowers = Array.from({ length: 15 }, (_, i) => {
    // Loose grid with jitter keeps flowers from clumping.
    const x = (i % 4) * 110 + 20 + r() * 60;
    const y = Math.floor(i / 4) * 105 + 30 + r() * 50;
    const s = 0.7 + r() * 0.9;
    const fill = petals[i % petals.length];
    const centre = petals[(i + 1) % petals.length];
    return (
      <g key={i} transform={`translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${(r() * 72).toFixed(0)}) scale(${s.toFixed(2)})`}>
        <path d="M-2 14c-10 12-24 12-30 4 10-8 22-10 30-4Z" fill={leaf} opacity="0.75" />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-15" rx="10" ry="15" fill={fill} transform={`rotate(${a})`} />
        ))}
        <circle r="7.500" fill={centre} />
      </g>
    );
  });
  return <>{flowers}</>;
}

const STAR = "M0-10 2.400-2.400 10 0 2.400 2.400 0 10-2.400 2.400-10 0-2.400-2.400Z";

function Stars({ colors, seed, animated }: PatternProps) {
  const r = seededRandom(seed + "stars");
  return (
    <>
      {Array.from({ length: 70 }, (_, i) => (
        <circle
          key={i}
          cx={(r() * 400).toFixed(1)}
          cy={(r() * 400).toFixed(1)}
          r={(0.6 + r() * 1.6).toFixed(2)}
          fill={colors[1]}
          opacity={(0.35 + r() * 0.6).toFixed(2)}
        />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d={STAR}
          fill={colors[i % 3 === 0 ? 2 : 0]}
          transform={`translate(${(20 + r() * 360).toFixed(0)} ${(20 + r() * 360).toFixed(0)}) scale(${(0.6 + r() * 1.3).toFixed(2)})`}
          className={anim(animated, "animate-twinkle")}
          style={{ animationDelay: `${(r() * 3).toFixed(2)}s` }}
        />
      ))}
      <path d="M318 62a40 40 0 1 0 28 68 32 32 0 1 1-28-68Z" fill={colors[0]} />
    </>
  );
}

function Balloons({ colors, seed, animated }: PatternProps) {
  const r = seededRandom(seed + "balloons");
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => {
        const x = 25 + (i % 5) * 86 + r() * 30;
        const y = 70 + Math.floor(i / 5) * 190 + r() * 60;
        const s = 0.85 + r() * 0.55;
        const c = colors[i % colors.length];
        return (
          <g
            key={i}
            className={anim(animated, "animate-float")}
            style={{ animationDelay: `${(-r() * 6).toFixed(1)}s`, transformOrigin: `${px(x)}px ${px(y)}px` }}
          >
            <g transform={`translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})`}>
              <path d="M0 44c-6 26 8 40-2 70" fill="none" stroke="#14213d" strokeOpacity="0.35" strokeWidth="1.500" />
              <ellipse cx="0" cy="0" rx="32" ry="40" fill={c} />
              <path d="M-6 40h12l-6 9Z" fill={c} />
              <ellipse cx="-11" cy="-15" rx="6" ry="10" fill="#fff" opacity="0.45" transform="rotate(-22 -11 -15)" />
            </g>
          </g>
        );
      })}
    </>
  );
}

function Waves({ colors, animated }: PatternProps) {
  const wave = (y: number, amp: number) => {
    let d = `M-200 ${y}`;
    for (let x = -200; x < 600; x += 100) d += ` q25 ${-amp} 50 0 t50 0`;
    return `${d} V420 H-200Z`;
  };
  return (
    <>
      <circle cx="318" cy="84" r="46" fill={colors[3]} />
      {[
        { y: 190, c: colors[2], o: 0.55, amp: 16 },
        { y: 235, c: colors[0], o: 0.85, amp: 20 },
        { y: 285, c: colors[1], o: 0.9, amp: 18 },
        { y: 335, c: colors[0], o: 1, amp: 14 },
      ].map((w, i) => (
        <path
          key={i}
          d={wave(w.y, w.amp)}
          fill={w.c}
          opacity={w.o}
          className={anim(animated, "animate-drift")}
          style={{ animationDuration: `${9 + i * 3}s`, animationDelay: `${-i * 2}s` }}
        />
      ))}
    </>
  );
}

function Checker({ colors, uid }: PatternProps) {
  return (
    <>
      <defs>
        <pattern id={`${uid}-gingham`} width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="25" height="50" fill={colors[0]} opacity="0.5" />
          <rect width="50" height="25" fill={colors[0]} opacity="0.5" />
        </pattern>
      </defs>
      <rect width="400" height="400" fill={`url(#${uid}-gingham)`} />
    </>
  );
}

function Frame({ colors }: PatternProps) {
  const corner = (x: number, y: number) => (
    <path key={`${x}-${y}`} d="M0-9 9 0 0 9-9 0Z" fill={colors[0]} transform={`translate(${x} ${y})`} />
  );
  return (
    <>
      <rect x="26" y="26" width="348" height="348" fill="none" stroke={colors[0]} strokeWidth="1.500" />
      <rect x="36" y="36" width="328" height="328" fill="none" stroke={colors[0]} strokeWidth="0.750" opacity="0.7" />
      {[
        [26, 26],
        [374, 26],
        [26, 374],
        [374, 374],
      ].map(([x, y]) => corner(x, y))}
      <path d="M150 318h100M176 330h48" stroke={colors[0]} strokeWidth="1" opacity="0.8" />
      <path d="M150 82h100M176 70h48" stroke={colors[0]} strokeWidth="1" opacity="0.8" />
    </>
  );
}

function Snow({ colors, seed, animated }: PatternProps) {
  const r = seededRandom(seed + "snow");
  return (
    <>
      {Array.from({ length: 46 }, (_, i) => (
        <circle
          key={i}
          cx={(r() * 400).toFixed(0)}
          cy={(r() * 400).toFixed(0)}
          r={(1.5 + r() * 3.5).toFixed(1)}
          fill={colors[0]}
          opacity={(0.5 + r() * 0.5).toFixed(2)}
          className={anim(animated && i % 2 === 0, "animate-fall")}
          style={{ animationDelay: `${(-r() * 12).toFixed(1)}s`, animationDuration: `${(9 + r() * 8).toFixed(1)}s` }}
        />
      ))}
      <ellipse cx="90" cy="420" rx="230" ry="90" fill={colors[0]} opacity="0.95" />
      <ellipse cx="330" cy="430" rx="220" ry="85" fill={colors[0]} opacity="0.8" />
      {[
        [70, 318, 1],
        [322, 334, 0.8],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M0-62 26-22H12L34 12H-34L-12-22H-26Z" fill={colors[1]} opacity="0.9" />
          <rect x="-5" y="12" width="10" height="16" fill={colors[2]} />
        </g>
      ))}
    </>
  );
}

function Grid({ colors, uid }: PatternProps) {
  const horizon = 232;
  const lines: ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const y = horizon + Math.pow(i / 8, 2.1) * (400 - horizon);
    lines.push(<path key={`h${i}`} d={`M0 ${y.toFixed(1)}H400`} stroke={colors[1]} strokeWidth="1.500" opacity="0.8" />);
  }
  for (let i = -8; i <= 8; i++) {
    lines.push(
      <path key={`v${i}`} d={`M200 ${horizon}L${200 + i * 70} 400`} stroke={colors[1]} strokeWidth="1.500" opacity="0.8" />,
    );
  }
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sun`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[1]} />
        </linearGradient>
        <clipPath id={`${uid}-sky`}>
          <rect width="400" height={horizon} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-sky)`}>
        <circle cx="200" cy={horizon - 8} r="104" fill={`url(#${uid}-sun)`} />
      </g>
      {lines}
      <path d={`M0 ${horizon}H400`} stroke={colors[2]} strokeWidth="2.500" />
    </>
  );
}

const HEART = "M0 9C-18-4-13-19 0-10 13-19 18-4 0 9Z";

function Hearts({ colors, seed, animated }: PatternProps) {
  const r = seededRandom(seed + "hearts");
  return (
    <>
      {Array.from({ length: 26 }, (_, i) => (
        <path
          key={i}
          d={HEART}
          fill={colors[i % colors.length]}
          opacity={(0.55 + r() * 0.45).toFixed(2)}
          transform={`translate(${(r() * 400).toFixed(0)} ${(r() * 400).toFixed(0)}) rotate(${(-25 + r() * 50).toFixed(0)}) scale(${(0.9 + r() * 2.2).toFixed(2)})`}
          className={anim(animated && i % 5 === 0, "animate-twinkle")}
          style={{ animationDelay: `${(r() * 3).toFixed(2)}s` }}
        />
      ))}
    </>
  );
}

function Stripes({ colors }: PatternProps) {
  return (
    <g transform="rotate(-24 200 200)">
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={-200 + i * 52} y="-200" width="52" height="800" fill={colors[i % colors.length]} />
      ))}
    </g>
  );
}

export const PATTERNS: Record<PatternKind, (props: PatternProps) => ReactNode> = {
  rays: Rays,
  confetti: Confetti,
  disco: Disco,
  blobs: Blobs,
  florals: Florals,
  stars: Stars,
  balloons: Balloons,
  waves: Waves,
  checker: Checker,
  frame: Frame,
  snow: Snow,
  grid: Grid,
  hearts: Hearts,
  stripes: Stripes,
};
