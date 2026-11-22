import { describe, expect, it } from "vitest";
import { eventInput, fieldErrors, parseGuestList, rsvpInput } from "../validation";

const base = {
  title: "Sam's 30th",
  hostName: "Maya",
  description: "",
  emoji: "🎂",
  themeId: "punch",
  dateMode: "set" as const,
  startsAtLocal: "2026-12-12T19:00",
  endsAtLocal: "",
  pollOptionsLocal: [],
  timezone: "America/New_York",
  locationName: "",
  locationAddress: "",
  onlineUrl: "",
  allowPlusOnes: true,
  maxPlusOnes: 2,
  capacity: null,
  guestListVisibility: "guests" as const,
  wallEnabled: true,
  photosEnabled: true,
  bringEnabled: false,
  bringItems: [],
  notifyHost: true,
};

describe("eventInput", () => {
  it("accepts a minimal event", () => {
    expect(eventInput.safeParse(base).success).toBe(true);
  });

  it("requires a title, a known theme and a real timezone", () => {
    const result = eventInput.safeParse({ ...base, title: " ", themeId: "nope", timezone: "Mars/Olympus" });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(["themeId", "timezone", "title"]);
  });

  it("requires the end to come after the start", () => {
    const result = eventInput.safeParse({ ...base, endsAtLocal: "2026-12-12T18:00" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).endsAtLocal).toMatch(/after the start/);
  });

  it("needs two distinct dates for a poll", () => {
    const one = { ...base, dateMode: "poll" as const, pollOptionsLocal: ["2026-12-12T19:00", "2026-12-12T19:00"] };
    expect(eventInput.safeParse(one).success).toBe(false);
    const two = { ...one, pollOptionsLocal: ["2026-12-12T19:00", "2026-12-19T19:00"] };
    expect(eventInput.safeParse(two).success).toBe(true);
  });

  it("normalises and vets the video link", () => {
    const ok = eventInput.safeParse({ ...base, onlineUrl: "meet.example.com/abc" });
    expect(ok.success && ok.data.onlineUrl).toBe("https://meet.example.com/abc");
    expect(eventInput.safeParse({ ...base, onlineUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(eventInput.safeParse({ ...base, onlineUrl: "not a link" }).success).toBe(false);
  });
});

describe("rsvpInput", () => {
  const rsvp = { eventId: "e1", status: "going" as const, name: "Priya", email: "", plusOnes: 1, note: "", pollOptionIds: [] };

  it("accepts a reply with just a name", () => {
    expect(rsvpInput.safeParse(rsvp).success).toBe(true);
  });

  it("rejects a blank name, a bad email and too many plus-ones", () => {
    expect(rsvpInput.safeParse({ ...rsvp, name: "   " }).success).toBe(false);
    expect(rsvpInput.safeParse({ ...rsvp, email: "priya@" }).success).toBe(false);
    expect(rsvpInput.safeParse({ ...rsvp, plusOnes: 50 }).success).toBe(false);
    expect(rsvpInput.safeParse({ ...rsvp, status: "waitlist" }).success).toBe(false);
  });
});

describe("parseGuestList", () => {
  it("reads names and emails in the common pasted shapes", () => {
    expect(
      parseGuestList("Sam Rivera sam@example.com\njo@example.com, Priya <priya@example.com>\n\"Lee, Al\" <al.lee@example.com>"),
    ).toEqual([
      { name: "Sam Rivera", email: "sam@example.com" },
      { name: "Jo", email: "jo@example.com" },
      { name: "Priya", email: "priya@example.com" },
      { name: "Al", email: "al.lee@example.com" },
    ]);
  });

  it("drops duplicates and lines without an address", () => {
    expect(parseGuestList("A a@x.co\nA2 A@X.CO\njust a name\n")).toEqual([{ name: "A", email: "a@x.co" }]);
  });

  it("builds a readable name from the address when none is given", () => {
    expect(parseGuestList("mary-jane.watson+party@example.com")[0].name).toBe("Mary Jane Watson");
  });
});
