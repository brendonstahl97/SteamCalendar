import { describe, expect, it } from "vitest";
import { gameToEvent, toGoogleEventPayload } from "@/lib/integrations/events";

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

  it("builds google payload", () => {
    const payload = toGoogleEventPayload({
      title: "Game Release",
      date: "2027-03-03",
      description: "desc",
    });
    expect(payload.start.date).toBe("2027-03-03");
    expect(payload.summary).toBe("Game Release");
  });
});
