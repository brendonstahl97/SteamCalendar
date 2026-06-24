import { describe, expect, it } from "vitest";
import { isAppIdArray, isValidAppId, isValidWishlistGameShape, isWishlistGameArray } from "@/lib/validation";

describe("validation", () => {
  it("accepts valid app ids", () => {
    expect(isValidAppId(42)).toBe(true);
    expect(isValidAppId(0)).toBe(false);
    expect(isValidAppId(2 ** 31)).toBe(false);
    expect(isValidAppId("1")).toBe(false);
  });

  it("validates app id arrays with bounds", () => {
    expect(isAppIdArray([1, 2, 3])).toBe(true);
    expect(isAppIdArray([])).toBe(false);
    expect(isAppIdArray([1, -1])).toBe(false);
  });

  it("validates wishlist game shape", () => {
    expect(
      isValidWishlistGameShape({
        appId: 1,
        name: "Game",
        releaseDateText: "Feb 1, 2027",
        storeUrl: "https://store.steampowered.com/app/1",
      }),
    ).toBe(true);
    expect(
      isValidWishlistGameShape({
        appId: 1,
        name: "Game",
        releaseDateText: "Feb 1, 2027",
        storeUrl: "https://evil.example/app/1",
      }),
    ).toBe(false);
  });

  it("validates wishlist game arrays", () => {
    const game = {
      appId: 1,
      name: "Game",
      releaseDateText: "Feb 1, 2027",
      storeUrl: "https://store.steampowered.com/app/1",
    };
    expect(isWishlistGameArray([game])).toBe(true);
    expect(isWishlistGameArray([])).toBe(true);
    expect(isWishlistGameArray([{ ...game, capsuleUrl: "http://insecure.example/img.jpg" }])).toBe(
      false,
    );
  });
});
