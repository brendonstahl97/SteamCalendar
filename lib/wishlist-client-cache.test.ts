import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearWishlistCache,
  readWishlistCache,
  writeWishlistCache,
  wishlistCacheKey,
  writeWishlistCache,
  type WishlistClientCache,
} from "@/lib/wishlist-client-cache";

const sampleGame = {
  appId: 100,
  name: "Future Game",
  releaseDateText: "Jan 15, 2030",
  releaseDate: "2030-01-15",
  releaseDateUnix: 1893456000,
  storeUrl: "https://store.steampowered.com/app/100",
};

const sampleCache = (steamId: string): WishlistClientCache => ({
  version: 1,
  steamId,
  games: [sampleGame],
  progress: { total: 1, processed: 1, emitted: 1, failed: 0 },
  fetchedAt: 1_700_000_000_000,
});

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("wishlist client cache", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("roundtrips a valid cache entry", () => {
    const steamId = "76561198000000000";
    expect(writeWishlistCache(steamId, sampleCache(steamId))).toBe(true);
    const read = readWishlistCache(steamId);
    expect(read?.games).toHaveLength(1);
    expect(read?.games[0].appId).toBe(100);
  });

  it("rejects cache for a different steam id", () => {
    const steamId = "76561198000000000";
    storage.setItem(wishlistCacheKey(steamId), JSON.stringify(sampleCache("other-id")));
    expect(readWishlistCache(steamId)).toBeNull();
    expect(storage.getItem(wishlistCacheKey(steamId))).toBeNull();
  });

  it("rejects invalid game payloads and deletes corrupt entries", () => {
    const steamId = "76561198000000000";
    storage.setItem(
      wishlistCacheKey(steamId),
      JSON.stringify({
        ...sampleCache(steamId),
        games: [{ appId: 1, name: "Bad", releaseDateText: "x", storeUrl: "https://evil.example/app/1" }],
      }),
    );
    expect(readWishlistCache(steamId)).toBeNull();
  });

  it("rejects oversized cache writes", () => {
    const steamId = "76561198000000000";
    const payload = sampleCache(steamId);
    payload.games = Array.from({ length: 80 }, (_, index) => ({
      ...sampleGame,
      appId: index + 1,
      name: "Long Game Name ".repeat(40),
      storeUrl: `https://store.steampowered.com/app/${index + 1}`,
    }));
    expect(writeWishlistCache(steamId, payload)).toBe(false);
  });

  it("clears one or all cache keys", () => {
    writeWishlistCache("111", sampleCache("111"));
    writeWishlistCache("222", sampleCache("222"));
    clearWishlistCache("111");
    expect(readWishlistCache("111")).toBeNull();
    expect(readWishlistCache("222")).not.toBeNull();
    clearWishlistCache();
    expect(readWishlistCache("222")).toBeNull();
  });
});
