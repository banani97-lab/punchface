import type { CSSProperties } from "react";

export type PatternKind =
  | "rays"
  | "confetti"
  | "disco"
  | "blobs"
  | "florals"
  | "stars"
  | "balloons"
  | "waves"
  | "checker"
  | "frame"
  | "snow"
  | "grid"
  | "hearts"
  | "stripes";

export type ThemeStyle = "pop" | "soft" | "elegant";
export type ThemeFont = "bricolage" | "fraunces" | "fraunces-italic" | "dynapuff";

export type Theme = {
  id: string;
  name: string;
  /** One-line mood, shown in the picker. */
  vibe: string;
  scheme: "light" | "dark";
  style: ThemeStyle;
  font: ThemeFont;
  /** Page colours. Contrast is enforced by src/lib/themes.test.ts. */
  bg: string;
  fg: string;
  muted: string;
  card: string;
  line: string;
  accent: string;
  accentFg: string;
  /** Cover art. */
  pattern: PatternKind;
  coverBg: string;
  coverColors: string[];
};

export const THEMES: Theme[] = [
  {
    id: "punch",
    name: "Punch",
    vibe: "Loud, sunny, impossible to ignore",
    scheme: "light",
    style: "pop",
    font: "bricolage",
    bg: "#fff1de",
    fg: "#1b1325",
    muted: "#5c5166",
    card: "#ffffff",
    line: "#1b1325",
    accent: "#ff4775",
    accentFg: "#1b1325",
    pattern: "rays",
    coverBg: "#ff4775",
    coverColors: ["#ffd93b", "#ff7a9c", "#fff1de"],
  },
  {
    id: "confetti",
    name: "Confetti Cannon",
    vibe: "Birthday energy, any age",
    scheme: "light",
    style: "pop",
    font: "bricolage",
    bg: "#fffaf0",
    fg: "#1f1a2e",
    muted: "#5d5870",
    card: "#ffffff",
    line: "#1f1a2e",
    accent: "#6c4dff",
    accentFg: "#ffffff",
    pattern: "confetti",
    coverBg: "#fff3d1",
    coverColors: ["#ff4775", "#6c4dff", "#00b894", "#ffb703", "#3aa8ff"],
  },
  {
    id: "disco",
    name: "Disco Nap",
    vibe: "Lights low, volume up",
    scheme: "dark",
    style: "soft",
    font: "bricolage",
    bg: "#150b2e",
    fg: "#f6eeff",
    muted: "#bcabdc",
    card: "#22133f",
    line: "#42307a",
    accent: "#ff5fdc",
    accentFg: "#1a0b2e",
    pattern: "disco",
    coverBg: "#1d0f40",
    coverColors: ["#ff5fdc", "#7b5cff", "#35e0ff", "#ffe45c"],
  },
  {
    id: "golden",
    name: "Golden Hour",
    vibe: "Warm drinks, long shadows",
    scheme: "light",
    style: "soft",
    font: "bricolage",
    bg: "#fff3e6",
    fg: "#3a1d0f",
    muted: "#75503d",
    card: "#ffffff",
    line: "#ecd3bd",
    accent: "#ff8a3d",
    accentFg: "#2a1208",
    pattern: "blobs",
    coverBg: "#ffb86b",
    coverColors: ["#ff5e62", "#ffd166", "#ff9a8b", "#ffe9c9"],
  },
  {
    id: "garden",
    name: "Garden Party",
    vibe: "Linen, lemonade, a little pollen",
    scheme: "light",
    style: "elegant",
    font: "fraunces",
    bg: "#f3f1e4",
    fg: "#24331f",
    muted: "#55624e",
    card: "#fbfaf2",
    line: "#b9bfa5",
    accent: "#2f5d3a",
    accentFg: "#ffffff",
    pattern: "florals",
    coverBg: "#dfe8cf",
    coverColors: ["#f28482", "#f6bd60", "#ffffff", "#84a59d", "#2f5d3a"],
  },
  {
    id: "midnight",
    name: "Midnight",
    vibe: "Starlit and a touch dramatic",
    scheme: "dark",
    style: "elegant",
    font: "fraunces",
    bg: "#0e1428",
    fg: "#f4ebd0",
    muted: "#aba994",
    card: "#161d36",
    line: "#39446b",
    accent: "#e7c56b",
    accentFg: "#0e1428",
    pattern: "stars",
    coverBg: "#0b1022",
    coverColors: ["#e7c56b", "#f4ebd0", "#8ea2ff"],
  },
  {
    id: "sprinkles",
    name: "Sprinkles",
    vibe: "Cake first, questions later",
    scheme: "light",
    style: "pop",
    font: "dynapuff",
    bg: "#e9f8ff",
    fg: "#14213d",
    muted: "#4a5674",
    card: "#ffffff",
    line: "#14213d",
    accent: "#ffb703",
    accentFg: "#14213d",
    pattern: "balloons",
    coverBg: "#bfe9ff",
    coverColors: ["#ff595e", "#ffca3a", "#8ac926", "#6a4c93", "#1982c4"],
  },
  {
    id: "pool",
    name: "Pool Day",
    vibe: "Sunscreen and bad cannonballs",
    scheme: "light",
    style: "soft",
    font: "bricolage",
    bg: "#e2f8fb",
    fg: "#073b4c",
    muted: "#3d6472",
    card: "#ffffff",
    line: "#b5e3ea",
    accent: "#14b8d4",
    accentFg: "#052630",
    pattern: "waves",
    coverBg: "#7fe3f0",
    coverColors: ["#14b8d4", "#0891b2", "#ffffff", "#ffd166"],
  },
  {
    id: "picnic",
    name: "Picnic",
    vibe: "Gingham, grass stains, good bread",
    scheme: "light",
    style: "pop",
    font: "bricolage",
    bg: "#fff8f0",
    fg: "#2b1a12",
    muted: "#69564c",
    card: "#ffffff",
    line: "#2b1a12",
    accent: "#d62828",
    accentFg: "#ffffff",
    pattern: "checker",
    coverBg: "#fff8f0",
    coverColors: ["#d62828", "#f4a4a4"],
  },
  {
    id: "blacktie",
    name: "Black Tie",
    vibe: "Sharp, quiet, expensive-looking",
    scheme: "dark",
    style: "elegant",
    font: "fraunces-italic",
    bg: "#0f0f10",
    fg: "#f5f0e6",
    muted: "#aaa498",
    card: "#19191b",
    line: "#45433f",
    accent: "#f5f0e6",
    accentFg: "#0f0f10",
    pattern: "frame",
    coverBg: "#0f0f10",
    coverColors: ["#d8c49a", "#f5f0e6"],
  },
  {
    id: "snowday",
    name: "Snow Day",
    vibe: "Mulled something, wool everything",
    scheme: "dark",
    style: "soft",
    font: "fraunces",
    bg: "#0f3b2e",
    fg: "#fbf5e6",
    muted: "#bcd0c2",
    card: "#154a3a",
    line: "#2d6b57",
    accent: "#f2c94c",
    accentFg: "#0f3b2e",
    pattern: "snow",
    coverBg: "#124536",
    coverColors: ["#ffffff", "#f2c94c", "#e63946"],
  },
  {
    id: "baby",
    name: "Hello Baby",
    vibe: "Soft, sleepy, very small socks",
    scheme: "light",
    style: "soft",
    font: "dynapuff",
    bg: "#f4f0ff",
    fg: "#2d2a4a",
    muted: "#5e5a7d",
    card: "#ffffff",
    line: "#d9d0f7",
    accent: "#b8a9ff",
    accentFg: "#1e1a3c",
    pattern: "blobs",
    coverBg: "#e4dcff",
    coverColors: ["#ffc8dd", "#bde0fe", "#fdf0c4", "#cdb4db"],
  },
  {
    id: "arcade",
    name: "Game Night",
    vibe: "Snacks, trash talk, one more round",
    scheme: "dark",
    style: "pop",
    font: "bricolage",
    bg: "#101020",
    fg: "#e8f9ff",
    muted: "#a3b3c9",
    card: "#1a1a33",
    line: "#e8f9ff",
    accent: "#39ff88",
    accentFg: "#06140c",
    pattern: "grid",
    coverBg: "#14102e",
    coverColors: ["#39ff88", "#ff3df0", "#35e0ff"],
  },
  {
    id: "love",
    name: "Love Letter",
    vibe: "Engagements, anniversaries, big feelings",
    scheme: "light",
    style: "elegant",
    font: "fraunces-italic",
    bg: "#fff0f0",
    fg: "#4a0d1a",
    muted: "#7c4551",
    card: "#fffafa",
    line: "#e8bcc4",
    accent: "#b3123a",
    accentFg: "#ffffff",
    pattern: "hearts",
    coverBg: "#ffd9de",
    coverColors: ["#b3123a", "#ff6b8a", "#ffffff"],
  },
  {
    id: "fiesta",
    name: "Fiesta",
    vibe: "Stripes, salsa, zero chill",
    scheme: "light",
    style: "pop",
    font: "bricolage",
    bg: "#fff4d6",
    fg: "#2a1436",
    muted: "#62506b",
    card: "#ffffff",
    line: "#2a1436",
    accent: "#00c2b8",
    accentFg: "#0b2422",
    pattern: "stripes",
    coverBg: "#ffd23f",
    coverColors: ["#ee4266", "#ffd23f", "#00c2b8", "#540d6e", "#ff8a3d"],
  },
];

export const DEFAULT_THEME_ID = "punch";

const THEME_MAP = new Map(THEMES.map((t) => [t.id, t]));

export function getTheme(id: string | null | undefined): Theme {
  return THEME_MAP.get(id ?? "") ?? THEME_MAP.get(DEFAULT_THEME_ID)!;
}

export function isThemeId(id: string): boolean {
  return THEME_MAP.has(id);
}

const FONT_VARS: Record<ThemeFont, Record<string, string>> = {
  bricolage: {
    "--display": "var(--font-bricolage)",
    "--display-weight": "800",
    "--display-style": "normal",
    "--display-tracking": "-0.035em",
  },
  fraunces: {
    "--display": "var(--font-fraunces)",
    "--display-weight": "600",
    "--display-style": "normal",
    "--display-tracking": "-0.02em",
  },
  "fraunces-italic": {
    "--display": "var(--font-fraunces)",
    "--display-weight": "500",
    "--display-style": "italic",
    "--display-tracking": "-0.015em",
  },
  dynapuff: {
    "--display": "var(--font-dynapuff)",
    "--display-weight": "700",
    "--display-style": "normal",
    "--display-tracking": "-0.01em",
  },
};

const STYLE_VARS: Record<ThemeStyle, Record<string, string>> = {
  pop: {
    "--radius": "20px",
    "--radius-btn": "14px",
    "--border-w": "2px",
    "--control": "var(--line)",
    "--shadow": "4px 4px 0 0 var(--line)",
    "--shadow-sm": "3px 3px 0 0 var(--line)",
  },
  soft: {
    "--radius": "24px",
    "--radius-btn": "999px",
    "--border-w": "1px",
    "--control": "color-mix(in srgb, var(--fg) 62%, var(--card))",
    "--shadow": "0 14px 36px -18px rgb(0 0 0 / 0.35)",
    "--shadow-sm": "0 6px 16px -10px rgb(0 0 0 / 0.35)",
  },
  elegant: {
    "--radius": "6px",
    "--radius-btn": "4px",
    "--border-w": "1px",
    "--control": "color-mix(in srgb, var(--fg) 62%, var(--card))",
    "--shadow": "0 0 0 0 transparent",
    "--shadow-sm": "0 0 0 0 transparent",
  },
};

/** Inline custom properties that re-skin everything inside a `.theme-scope`. */
export function themeVars(theme: Theme): CSSProperties {
  const dark = theme.scheme === "dark";
  return {
    "--bg": theme.bg,
    "--fg": theme.fg,
    "--muted": theme.muted,
    "--card": theme.card,
    "--line": theme.line,
    "--accent": theme.accent,
    "--accent-fg": theme.accentFg,
    "--accent-2": theme.coverColors[0],
    "--danger": dark ? "#ff9aa8" : "#b3122b",
    "--ok": dark ? "#6fe3ad" : "#0b6e45",
    ...FONT_VARS[theme.font],
    ...STYLE_VARS[theme.style],
    colorScheme: theme.scheme,
  } as CSSProperties;
}

// ---------------------------------------------------------------------------
// Occasions: quick-start presets for the create flow.
// ---------------------------------------------------------------------------

export type Occasion = {
  id: string;
  label: string;
  emoji: string;
  themeId: string;
  titleHint: string;
  bring?: string[];
};

export const OCCASIONS: Occasion[] = [
  { id: "birthday", label: "Birthday", emoji: "🎂", themeId: "confetti", titleHint: "Sam’s 30th" },
  { id: "kids", label: "Kids' party", emoji: "🎈", themeId: "sprinkles", titleHint: "Mia turns 6!" },
  { id: "house", label: "House party", emoji: "🪩", themeId: "disco", titleHint: "Housewarming at ours" },
  {
    id: "dinner",
    label: "Dinner",
    emoji: "🍝",
    themeId: "golden",
    titleHint: "Sunday supper club",
    bring: ["A bottle of something", "Dessert"],
  },
  {
    id: "bbq",
    label: "BBQ / picnic",
    emoji: "🧺",
    themeId: "picnic",
    titleHint: "Park picnic",
    bring: ["Drinks", "Chips & dips", "Something for the grill", "Ice"],
  },
  { id: "shower", label: "Baby shower", emoji: "🍼", themeId: "baby", titleHint: "Shower for Priya" },
  { id: "engagement", label: "Engagement", emoji: "💍", themeId: "love", titleHint: "We’re engaged!" },
  { id: "game", label: "Game night", emoji: "🎲", themeId: "arcade", titleHint: "Game night", bring: ["Snacks", "Your favourite game"] },
  { id: "holiday", label: "Holiday", emoji: "🎄", themeId: "snowday", titleHint: "Holiday cookie swap" },
  { id: "pool", label: "Pool party", emoji: "🏖️", themeId: "pool", titleHint: "Pool day" },
  { id: "fancy", label: "Something fancy", emoji: "🥂", themeId: "blacktie", titleHint: "An evening at the Ashbys'" },
  { id: "other", label: "Something else", emoji: "🎉", themeId: "punch", titleHint: "The thing we’re doing" },
];

export const EMOJI_CHOICES = [
  "🎉", "🎂", "🎈", "🥳", "🪩", "🍾", "🥂", "🍕", "🍝", "🌮", "🧺", "🔥",
  "🎲", "🎬", "🎤", "🏖️", "🏡", "🍼", "💍", "💐", "🎄", "🎃", "⚽", "🧁",
];
