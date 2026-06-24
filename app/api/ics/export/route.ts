import { NextRequest, NextResponse } from "next/server";
import { gameToEvent, toICS } from "@/lib/integrations/events";
import { resolveWishlistGamesByAppIds } from "@/lib/integrations/steam";
import { MAX_JSON_BODY_BYTES } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { isAppIdArray } from "@/lib/validation";

function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`ics:${clientKey(request)}`, 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const session = await getSession();
  if (!session.steamConnected || !session.steamId) {
    return NextResponse.json({ error: "Steam is not connected." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large." }, { status: 413 });
  }

  const body = (await request.json()) as { appIds?: number[] };
  if (!isAppIdArray(body.appIds)) {
    return NextResponse.json({ error: "Invalid appIds payload." }, { status: 400 });
  }

  const games = await resolveWishlistGamesByAppIds(session.steamId, body.appIds);
  const events = games
    .map(gameToEvent)
    .filter((event): event is NonNullable<ReturnType<typeof gameToEvent>> =>
      Boolean(event),
    );

  if (events.length === 0) {
    return NextResponse.json({ error: "No eligible games found." }, { status: 400 });
  }

  const ics = toICS(events);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=steam-releases.ics",
    },
  });
}
