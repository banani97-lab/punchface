import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl } from "../ics";
import { newEventSlug, slugify } from "../ids";
import { avatarColor, initials, seededRandom } from "../utils";

describe("slugs", () => {
  it("makes readable, URL-safe slugs", () => {
    expect(slugify("Sam's 30th!!")).toBe("sams-30th");
    expect(slugify("Fête d’été à Paris")).toBe("fete-dete-a-paris");
    expect(slugify("🎉🎉")).toBe("");
  });

  it("adds an unguessable suffix", () => {
    const a = newEventSlug("Game night");
    const b = newEventSlug("Game night");
    expect(a).toMatch(/^game-night-[2-9a-z]{8}$/);
    expect(a).not.toBe(b);
    expect(newEventSlug("🎉")).toMatch(/^[2-9a-z]{8}$/);
  });
});

describe("ics", () => {
  const event = {
    id: "abc",
    title: "Dinner; drinks, dancing",
    description: "Line one\nLine two",
    startsAt: Date.UTC(2026, 11, 13, 0, 0),
    endsAt: null,
    location: "12 Lemon St, Springfield",
    url: "https://punchface.example/e/dinner-abc",
    updatedAt: Date.UTC(2026, 10, 1),
  };

  it("produces a valid calendar entry with escaped text", () => {
    const ics = buildIcs(event);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261213T000000Z");
    expect(ics).toContain("DTEND:20261213T030000Z"); // defaults to three hours
    expect(ics).toContain(String.raw`SUMMARY:Dinner\; drinks\, dancing`);
    expect(ics).toContain(String.raw`Line one\nLine two`);
    expect(ics).toContain("STATUS:CONFIRMED");
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });

  it("marks cancelled events", () => {
    expect(buildIcs({ ...event, cancelled: true })).toContain("STATUS:CANCELLED");
  });

  it("builds a Google Calendar link", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get("dates")).toBe("20261213T000000Z/20261213T030000Z");
    expect(url.searchParams.get("text")).toBe(event.title);
  });
});

describe("utils", () => {
  it("derives initials", () => {
    expect(initials("Priya Patel")).toBe("PP");
    expect(initials("cher")).toBe("C");
    expect(initials("  ")).toBe("?");
    expect(initials("Mary Jane Watson")).toBe("MW");
  });

  it("is deterministic where rendering depends on it", () => {
    expect(avatarColor("Priya")).toBe(avatarColor("Priya"));
    const a = seededRandom("seed");
    const b = seededRandom("seed");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seededRandom("other")()).not.toBe(seededRandom("seed")());
  });
});
