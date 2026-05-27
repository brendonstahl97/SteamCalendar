import { describe, expect, it } from "vitest";
import {
  filterUnreleasedGames,
  mapAppDetailsToWishlistGame,
  toWishlistGame,
} from "@/lib/integrations/steam";

describe("steam integration", () => {
  it("maps wishlist game data", () => {
    const mapped = toWishlistGame(100, {
      name: "Test Game",
      release_string: "Jan 15, 2027",
      release_date: 1800000000,
      capsule: "https://cdn.example/capsule.jpg",
    });
    expect(mapped.appId).toBe(100);
    expect(mapped.releaseDate).toBe("2027-01-15");
    expect(mapped.storeUrl).toContain("/app/100");
  });

  it("maps app details with concrete release date", () => {
    const mapped = mapAppDetailsToWishlistGame(42, {
      name: "Future Game",
      header_image: "https://cdn.example/header.jpg",
      release_date: { coming_soon: true, date: "Dec 31, 2027" },
    });
    expect(mapped.releaseDateText).toBe("Dec 31, 2027");
    expect(mapped.releaseDate).toBe("2027-12-31");
  });

  it("rejects non-concrete release date text", () => {
    const mappedComingSoon = mapAppDetailsToWishlistGame(11, {
      name: "Soonish",
      release_date: { coming_soon: true, date: "Coming Soon" },
    });
    const mappedTba = mapAppDetailsToWishlistGame(12, {
      name: "TBA Game",
      release_date: { coming_soon: true, date: "To be announced" },
    });
    const mappedYearOnly = mapAppDetailsToWishlistGame(13, {
      name: "Year only",
      release_date: { coming_soon: true, date: "2027" },
    });
    const mappedMonthOnly = mapAppDetailsToWishlistGame(14, {
      name: "Month only",
      release_date: { coming_soon: true, date: "March 2027" },
    });
    const mappedQuarterOnly = mapAppDetailsToWishlistGame(15, {
      name: "Quarter only",
      release_date: { coming_soon: true, date: "Q3 2027" },
    });

    expect(mappedComingSoon.releaseDate).toBeUndefined();
    expect(mappedTba.releaseDate).toBeUndefined();
    expect(mappedYearOnly.releaseDate).toBeUndefined();
    expect(mappedMonthOnly.releaseDate).toBeUndefined();
    expect(mappedQuarterOnly.releaseDate).toBeUndefined();
  });

  it("keeps only unreleased games with concrete full dates", () => {
    const now = Math.floor(Date.now() / 1000);
    const list = [
      {
        appId: 1,
        name: "Past",
        releaseDateText: "old",
        releaseDate: "2020-01-01",
        releaseDateUnix: now - 86400,
        storeUrl: "a",
      },
      {
        appId: 2,
        name: "Future",
        releaseDateText: "future",
        releaseDate: "2030-01-01",
        releaseDateUnix: now + 86400,
        storeUrl: "b",
      },
      {
        appId: 3,
        name: "ComingSoon",
        releaseDateText: "Coming Soon",
        storeUrl: "c",
      },
      {
        appId: 4,
        name: "NoUnix",
        releaseDateText: "Jan 1, 2030",
        releaseDate: "2030-01-01",
        storeUrl: "c",
      },
    ];
    const unreleased = filterUnreleasedGames(list);
    expect(unreleased.map((g) => g.appId)).toEqual([2]);
  });
});
