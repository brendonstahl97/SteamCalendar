import { describe, expect, it } from "vitest";
import {
  gameToEvent,
  toGoogleCalendarTemplateUrl,
  toICS,
} from "@/lib/integrations/events";

describe("event mapping", () => {
  it("creates event from a game with exact date", () => {
    const event = gameToEvent({
      appId: 1,
      name: "Launch",
      releaseDateText: "Feb 20, 2027",
      releaseDate: "2027-02-20",
      storeUrl: "https://store.steampowered.com/app/1",
    });
    expect(event?.title).toContain("Release");
    expect(event?.date).toBe("2027-02-20");
  });

  it("returns null when date is unknown", () => {
    const event = gameToEvent({
      appId: 2,
      name: "TBD",
      releaseDateText: "Coming soon",
      storeUrl: "https://store.steampowered.com/app/2",
    });
    expect(event).toBeNull();
  });

  it("escapes special characters in ics output", () => {
    const ics = toICS([
      {
        title: "Game; Name, Part",
        date: "2027-03-03",
        description: "Line1\nLine2\\path",
      },
    ]);
    expect(ics).toContain("SUMMARY:Game\\; Name\\, Part");
    expect(ics).toContain("DESCRIPTION:Line1\\nLine2\\\\path");
  });
});

describe("toGoogleCalendarTemplateUrl", () => {
  it("builds a valid template URL with all-day dates", () => {
    const url = toGoogleCalendarTemplateUrl({
      title: "Game Release",
      date: "2027-03-03",
      description: "Steam release",
    });
    expect(url).toMatch(
      /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE&/,
    );
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("text")).toBe("Game Release");
    expect(parsed.searchParams.get("dates")).toBe("20270303/20270304");
    expect(parsed.searchParams.get("details")).toBe("Steam release");
  });

  it("encodes special characters in query params", () => {
    const url = toGoogleCalendarTemplateUrl({
      title: "Game & Co? #1",
      date: "2027-03-03",
      description: "Line1\nLine2&foo=bar",
    });
    expect(url).toContain("https://calendar.google.com/calendar/render?");
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("text")).toBe("Game & Co? #1");
    expect(parsed.searchParams.get("details")).toBe("Line1\nLine2&foo=bar");
  });

  it("returns null for invalid dates", () => {
    expect(
      toGoogleCalendarTemplateUrl({
        title: "Bad",
        date: "2027-13-40",
        description: "desc",
      }),
    ).toBeNull();
    expect(
      toGoogleCalendarTemplateUrl({
        title: "Bad",
        date: "not-a-date",
        description: "desc",
      }),
    ).toBeNull();
  });

  it("truncates long descriptions", () => {
    const longDescription = "x".repeat(1000);
    const url = toGoogleCalendarTemplateUrl({
      title: "Game",
      date: "2027-03-03",
      description: longDescription,
    });
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("details")?.length).toBe(800);
  });
});
