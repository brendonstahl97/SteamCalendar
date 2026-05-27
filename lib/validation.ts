import { WishlistGame } from "@/lib/integrations/types";

export function isWishlistGameArray(value: unknown): value is WishlistGame[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const game = item as Partial<WishlistGame>;
    return (
      typeof game.appId === "number" &&
      typeof game.name === "string" &&
      typeof game.releaseDateText === "string" &&
      typeof game.storeUrl === "string"
    );
  });
}
