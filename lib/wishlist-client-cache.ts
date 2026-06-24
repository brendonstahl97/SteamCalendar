import { WishlistGame } from "@/lib/integrations/types";
import { isWishlistGameArray } from "@/lib/validation";

export type WishlistStreamProgress = {
  total: number;
  processed: number;
  emitted: number;
  failed: number;
};

export type WishlistClientCache = {
  version: 1;
  steamId: string;
  games: WishlistGame[];
  progress: WishlistStreamProgress;
  fetchedAt: number;
};

const CACHE_PREFIX = "swc:wishlist:v1:";
export const MAX_WISHLIST_CACHE_BYTES = 512 * 1024;

export function wishlistCacheKey(steamId: string): string {
  return `${CACHE_PREFIX}${steamId}`;
}

function getStorage(): Storage | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return localStorage;
}

function isStreamProgress(value: unknown): value is WishlistStreamProgress {
  if (!value || typeof value !== "object") {
    return false;
  }
  const progress = value as Record<string, unknown>;
  return (
    typeof progress.total === "number" &&
    typeof progress.processed === "number" &&
    typeof progress.emitted === "number" &&
    typeof progress.failed === "number"
  );
}

function isValidCachePayload(value: unknown, steamId: string): value is WishlistClientCache {
  if (!value || typeof value !== "object") {
    return false;
  }
  const cache = value as Record<string, unknown>;
  if (cache.version !== 1) {
    return false;
  }
  if (typeof cache.steamId !== "string" || cache.steamId !== steamId) {
    return false;
  }
  if (typeof cache.fetchedAt !== "number" || !Number.isFinite(cache.fetchedAt)) {
    return false;
  }
  if (!isWishlistGameArray(cache.games)) {
    return false;
  }
  if (!isStreamProgress(cache.progress)) {
    return false;
  }
  return true;
}

export function readWishlistCache(steamId: string): WishlistClientCache | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const key = wishlistCacheKey(steamId);
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidCachePayload(parsed, steamId)) {
      storage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function writeWishlistCache(steamId: string, payload: WishlistClientCache): boolean {
  const storage = getStorage();
  if (!storage || !isValidCachePayload(payload, steamId)) {
    return false;
  }

  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_WISHLIST_CACHE_BYTES) {
    return false;
  }

  storage.setItem(wishlistCacheKey(steamId), serialized);
  return true;
}

export function clearWishlistCache(steamId?: string): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  if (steamId) {
    storage.removeItem(wishlistCacheKey(steamId));
    return;
  }

  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    storage.removeItem(key);
  }
}
