import { describe, expect, it } from "vitest";
import { OCCASIONS, THEMES, getTheme, isThemeId } from "../themes";

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("themes", () => {
  it("have unique ids and six-digit hex colours", () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    for (const t of THEMES) {
      for (const c of [t.bg, t.fg, t.muted, t.card, t.line, t.accent, t.accentFg, t.coverBg, ...t.coverColors]) {
        expect(c, `${t.id}: ${c}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  // WCAG 2.2 AA: 4.5:1 for body text, 3:1 for the boundaries of controls.
  it.each(THEMES.map((t) => [t.id, t] as const))("%s meets WCAG AA contrast", (_id, t) => {
    expect(contrast(t.fg, t.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(t.fg, t.card)).toBeGreaterThanOrEqual(7);
    expect(contrast(t.muted, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.muted, t.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.accentFg, t.accent)).toBeGreaterThanOrEqual(4.5);
    // Card outlines may be subtle, but pop themes draw every edge in `line`.
    if (t.style === "pop") expect(contrast(t.line, t.bg)).toBeGreaterThanOrEqual(3);
  });

  it("falls back to the default theme for unknown ids", () => {
    expect(getTheme("nope").id).toBe("punch");
    expect(getTheme(null).id).toBe("punch");
    expect(isThemeId("disco")).toBe(true);
    expect(isThemeId("nope")).toBe(false);
  });

  it("gives every occasion a real theme", () => {
    for (const o of OCCASIONS) expect(isThemeId(o.themeId), o.id).toBe(true);
  });
});
