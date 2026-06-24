import { MAX_GAMES_PER_REQUEST } from "@/lib/constants";

const STEAM_STORE_URL = /^https:\/\/store\.steampowered\.com\/app\/\d+$/;
const MAX_NAME_LENGTH = 500;
const MAX_RELEASE_TEXT_LENGTH = 200;

export function isValidAppId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value < 2 ** 31
  );
}

export function isAppIdArray(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_GAMES_PER_REQUEST) {
    return false;
  }
  return value.every(isValidAppId);
}

export function isValidStoreUrl(value: string, appId: number): boolean {
  return STEAM_STORE_URL.test(value) && value.endsWith(`/${appId}`);
}

export function isValidWishlistGameShape(item: unknown): boolean {
  if (!item || typeof item !== "object") {
    return false;
  }
  const game = item as Record<string, unknown>;
  if (!isValidAppId(game.appId)) {
    return false;
  }
  if (typeof game.name !== "string" || game.name.length > MAX_NAME_LENGTH) {
    return false;
  }
  if (
    typeof game.releaseDateText !== "string" ||
    game.releaseDateText.length > MAX_RELEASE_TEXT_LENGTH
  ) {
    return false;
  }
  if (typeof game.storeUrl !== "string" || !isValidStoreUrl(game.storeUrl, game.appId)) {
    return false;
  }
  if (game.releaseDate !== undefined && typeof game.releaseDate !== "string") {
    return false;
  }
  if (game.releaseDateUnix !== undefined && typeof game.releaseDateUnix !== "number") {
    return false;
  }
  if (game.capsuleUrl !== undefined && typeof game.capsuleUrl !== "string") {
    return false;
  }
  return true;
}
