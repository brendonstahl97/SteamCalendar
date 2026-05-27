import { NextRequest, NextResponse } from "next/server";
import { gameToEvent, toICS } from "@/lib/integrations/events";
import { WishlistGame } from "@/lib/integrations/types";
import { isWishlistGameArray } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { games?: WishlistGame[] };
  if (!isWishlistGameArray(body.games ?? [])) {
    return NextResponse.json({ error: "Invalid games payload." }, { status: 400 });
  }
  const games = body.games ?? [];
  const events = games
    .map(gameToEvent)
    .filter((event): event is NonNullable<ReturnType<typeof gameToEvent>> =>
      Boolean(event),
    );
  const ics = toICS(events);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=steam-releases.ics",
    },
  });
}
