import { NextResponse } from "next/server";
import { fetchWishlist } from "@/lib/integrations/steam";
import { getSession } from "@/lib/session";

export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session.steamConnected || !session.steamId) {
    return NextResponse.json({ error: "Steam is not connected." }, { status: 401 });
  }

  try {
    const games = await fetchWishlist(session.steamId);
    return NextResponse.json({ games });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch wishlist." },
      { status: 500 },
    );
  }
}
