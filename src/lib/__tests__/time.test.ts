import { describe, expect, it } from "vitest";
import { formatTimeRange, formatWhen, isValidTimeZone, relativeDay, timeAgo, utcToZonedInput, zonedToUtc } from "../time";

describe("zonedToUtc", () => {
  it("converts wall time in a zone to a UTC instant", () => {
    expect(zonedToUtc("2026-12-12T19:00", "America/New_York")).toBe(Date.UTC(2026, 11, 13, 0, 0));
    expect(zonedToUtc("2026-07-04T19:00", "America/New_York")).toBe(Date.UTC(2026, 6, 4, 23, 0));
    expect(zonedToUtc("2026-07-04T19:00", "Asia/Kolkata")).toBe(Date.UTC(2026, 6, 4, 13, 30));
    expect(zonedToUtc("2026-01-01T00:00", "UTC")).toBe(Date.UTC(2026, 0, 1));
  });

  it("round-trips through utcToZonedInput", () => {
    for (const tz of ["America/Los_Angeles", "Europe/London", "Australia/Sydney", "Asia/Kathmandu"]) {
      for (const local of ["2026-03-08T01:30", "2026-06-15T12:00", "2026-11-01T23:45", "2027-01-31T08:05"]) {
        expect(utcToZonedInput(zonedToUtc(local, tz)!, tz), `${tz} ${local}`).toBe(local);
      }
    }
  });

  it("handles the evening after a daylight-saving change", () => {
    // US clocks spring forward on 2026-03-08; 7pm that day is already EDT (UTC-4).
    expect(zonedToUtc("2026-03-08T19:00", "America/New_York")).toBe(Date.UTC(2026, 2, 8, 23, 0));
    // …and fall back on 2026-11-01; 7pm is EST (UTC-5).
    expect(zonedToUtc("2026-11-01T19:00", "America/New_York")).toBe(Date.UTC(2026, 10, 2, 0, 0));
  });

  it("rejects malformed input", () => {
    expect(zonedToUtc("tomorrow", "UTC")).toBeNull();
    expect(zonedToUtc("2026-12-12", "UTC")).toBeNull();
  });
});

describe("formatting", () => {
  const start = Date.UTC(2026, 11, 13, 0, 0); // Sat Dec 12, 7pm in New York
  const tz = "America/New_York";

  it("formats a start time and a range", () => {
    expect(formatTimeRange(start, null, tz)).toBe("7 PM EST");
    expect(formatTimeRange(start, start + 4 * 3600_000, tz)).toBe("7 PM – 11 PM EST");
    expect(formatTimeRange(start + 30 * 60_000, null, tz)).toBe("7:30 PM EST");
  });

  it("keeps a party that runs past midnight on one line", () => {
    expect(formatTimeRange(start, start + 7 * 3600_000, tz)).toBe("7 PM – 2 AM EST");
  });

  it("summarises when", () => {
    expect(formatWhen(start, null, tz)).toBe("Sat, Dec 12 · 7 PM EST");
    expect(formatWhen(null, null, tz)).toBe("Date to be decided");
  });

  it("describes days relative to now in the event's zone", () => {
    expect(relativeDay(start, tz, start - 2 * 3600_000)).toBe("Today");
    expect(relativeDay(start, tz, start - 24 * 3600_000)).toBe("Tomorrow");
    expect(relativeDay(start, tz, start - 5 * 86_400_000)).toBe("In 5 days");
    expect(relativeDay(start, tz, start + 3 * 86_400_000)).toBe("3 days ago");
  });

  it("formats short relative times", () => {
    const now = Date.UTC(2026, 0, 10, 12);
    expect(timeAgo(now - 10_000, now)).toBe("just now");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5m");
    expect(timeAgo(now - 3 * 3600_000, now)).toBe("3h");
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe("2d");
  });

  it("validates timezones", () => {
    expect(isValidTimeZone("Europe/Paris")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});
