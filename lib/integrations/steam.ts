import { WishlistGame } from "@/lib/integrations/types";

type RawWishlistGame = {
  name: string;
  release_string: string;
  release_date?: number;
  capsule?: string;
};

type WishlistApiItem = {
  appid: number;
};

type AppDetailsRelease = {
  coming_soon: boolean;
  date?: string;
};

type AppDetailsData = {
  name: string;
  header_image?: string;
  release_date: AppDetailsRelease;
};

const WISHLIST_API =
  "https://api.steampowered.com/IWishlistService/GetWishlist/v1/";
const APP_DETAILS_API = "https://store.steampowered.com/api/appdetails";
const APP_DETAILS_CONCURRENCY = 2;
const APP_DETAILS_DELAY_MS = 300;
const APP_DETAILS_RETRIES = 4;
const APP_DETAILS_CACHE_TTL_MS = 15 * 60 * 1000;
const WISHLIST_CACHE_TTL_MS = 5 * 60 * 1000;
const STEAM_STORE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type CacheEntry<T> = { value: T; expiresAt: number };

const appDetailsCache = new Map<number, CacheEntry<AppDetailsData>>();
const wishlistCache = new Map<string, CacheEntry<WishlistGame[]>>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readCache<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) {
      cache.delete(key);
    }
    return null;
  }
  return entry.value;
}

function writeCache<T>(
  cache: Map<string | number, CacheEntry<T>>,
  key: string | number,
  value: T,
  ttlMs: number,
) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function parseExactDate(value: string): string | undefined {
  const normalized = value.trim();
  const lowered = normalized.toLowerCase();

  if (
    lowered === "coming soon" ||
    lowered === "to be announced" ||
    lowered === "tba" ||
    lowered === "unknown"
  ) {
    return undefined;
  }

  const hasSpelledMonthDayYear =
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},\s+\d{4}$/i.test(
      normalized,
    );
  const hasNumericMonthDayYear = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalized);
  if (!hasSpelledMonthDayYear && !hasNumericMonthDayYear) {
    return undefined;
  }

  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

export function toWishlistGame(appId: number, raw: RawWishlistGame): WishlistGame {
  return {
    appId,
    name: raw.name,
    releaseDateText: raw.release_string || "Unknown",
    releaseDate: raw.release_string ? parseExactDate(raw.release_string) : undefined,
    releaseDateUnix: raw.release_date,
    capsuleUrl: raw.capsule,
    storeUrl: `https://store.steampowered.com/app/${appId}`,
  };
}

export function mapAppDetailsToWishlistGame(
  appId: number,
  details: AppDetailsData,
): WishlistGame {
  const release = details.release_date;
  const releaseDateText =
    release.coming_soon && !release.date
      ? "TBD"
      : release.date || "Unknown";
  let releaseDateUnix: number | undefined;
  if (release.date) {
    const parsed = Date.parse(release.date);
    if (!Number.isNaN(parsed)) {
      releaseDateUnix = Math.floor(parsed / 1000);
    }
  }

  return {
    appId,
    name: details.name,
    releaseDateText,
    releaseDate: release.date ? parseExactDate(release.date) : undefined,
    releaseDateUnix,
    capsuleUrl: details.header_image,
    storeUrl: `https://store.steampowered.com/app/${appId}`,
  };
}

export function filterUnreleasedGames(games: WishlistGame[]): WishlistGame[] {
  const now = Date.now();
  return games
    .filter((game) => {
      if (game.releaseDate && game.releaseDateUnix) {
        return game.releaseDateUnix * 1000 > now;
      }
      return false;
    })
    .sort((a, b) => {
      const aDate = a.releaseDateUnix ?? Number.MAX_SAFE_INTEGER;
      const bDate = b.releaseDateUnix ?? Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });
}

async function fetchWishlistItems(steamId: string): Promise<WishlistApiItem[]> {
  const url = new URL(WISHLIST_API);
  url.searchParams.set("steamid", steamId);
  const apiKey = process.env.STEAM_WEB_API_KEY;
  if (apiKey) {
    url.searchParams.set("key", apiKey);
  }

  const res = await fetch(url, { cache: "no-store" });
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (!res.ok) {
    throw new Error("Unable to fetch Steam wishlist.");
  }

  if (!contentType.includes("json") && text.trim().startsWith("<")) {
    throw new Error(
      "Steam returned HTML instead of wishlist JSON. Ensure your wishlist privacy is set to Public.",
    );
  }

  const payload = JSON.parse(text) as { response?: { items?: WishlistApiItem[] } };
  return payload.response?.items ?? [];
}

async function fetchAppDetails(appId: number): Promise<AppDetailsData | null> {
  const cached = readCache(appDetailsCache, appId);
  if (cached) {
    return cached;
  }

  const url = new URL(APP_DETAILS_API);
  url.searchParams.set("appids", String(appId));
  url.searchParams.set("cc", "us");

  for (let attempt = 0; attempt < APP_DETAILS_RETRIES; attempt += 1) {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": STEAM_STORE_USER_AGENT },
    });
    const text = await res.text();
    const trimmed = text.trim();

    if (!res.ok || trimmed.startsWith("<") || trimmed === "null" || !trimmed.startsWith("{")) {
      await sleep(400 * (attempt + 1));
      continue;
    }

    try {
      const payload = JSON.parse(text) as Record<
        string,
        { success: boolean; data?: AppDetailsData }
      >;
      const entry = payload[String(appId)];
      if (entry?.success && entry.data) {
        writeCache(appDetailsCache, appId, entry.data, APP_DETAILS_CACHE_TTL_MS);
        return entry.data;
      }
    } catch {
      // Retry on malformed payloads from rate limiting.
    }

    await sleep(400 * (attempt + 1));
  }

  return null;
}

async function fetchAppDetailsForApps(appIds: number[]) {
  const results = new Map<number, AppDetailsData>();
  let index = 0;

  async function worker() {
    while (index < appIds.length) {
      const current = appIds[index];
      index += 1;
      const details = await fetchAppDetails(current);
      if (details) {
        results.set(current, details);
      }
      await sleep(APP_DETAILS_DELAY_MS);
    }
  }

  const workers = Array.from(
    { length: Math.min(APP_DETAILS_CONCURRENCY, appIds.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export type WishlistStreamProgress = {
  total: number;
  processed: number;
  emitted: number;
  failed: number;
};

type StreamHandlers = {
  onItem: (item: WishlistGame) => Promise<void> | void;
  onProgress?: (progress: WishlistStreamProgress) => Promise<void> | void;
};

export async function streamWishlistGames(
  steamId: string,
  handlers: StreamHandlers,
): Promise<WishlistStreamProgress> {
  const items = await fetchWishlistItems(steamId);
  const progress: WishlistStreamProgress = {
    total: items.length,
    processed: 0,
    emitted: 0,
    failed: 0,
  };

  await handlers.onProgress?.(progress);

  for (const item of items) {
    const details = await fetchAppDetails(item.appid);
    progress.processed += 1;
    if (!details) {
      progress.failed += 1;
      await handlers.onProgress?.(progress);
      await sleep(APP_DETAILS_DELAY_MS);
      continue;
    }

    const game = mapAppDetailsToWishlistGame(item.appid, details);
    const eligible = filterUnreleasedGames([game]);
    if (eligible.length > 0) {
      progress.emitted += 1;
      await handlers.onItem(eligible[0]);
    }
    await handlers.onProgress?.(progress);
    await sleep(APP_DETAILS_DELAY_MS);
  }

  return progress;
}

export async function fetchWishlist(steamId: string) {
  const cachedWishlist = readCache(wishlistCache, steamId);
  if (cachedWishlist) {
    return cachedWishlist;
  }

  const items = await fetchWishlistItems(steamId);
  const appIds = items.map((item) => item.appid);
  const detailsByAppId = await fetchAppDetailsForApps(appIds);
  const games = appIds
    .map((appId) => {
      const details = detailsByAppId.get(appId);
      if (!details) {
        return null;
      }
      return mapAppDetailsToWishlistGame(appId, details);
    })
    .filter((game): game is WishlistGame => Boolean(game));

  const unreleased = filterUnreleasedGames(games);
  if (items.length > 0 && games.length === 0) {
    throw new Error(
      "Steam rate-limited game metadata requests. Wait 30 seconds, then reload the page.",
    );
  }
  writeCache(wishlistCache, steamId, unreleased, WISHLIST_CACHE_TTL_MS);
  return unreleased;
}
