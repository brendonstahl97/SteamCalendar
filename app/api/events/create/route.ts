import { NextRequest, NextResponse } from "next/server";
import { gameToEvent, toGoogleEventPayload } from "@/lib/integrations/events";
import { WishlistGame } from "@/lib/integrations/types";
import { getSession } from "@/lib/session";
import { isWishlistGameArray } from "@/lib/validation";

type CreateRequest = {
  games: WishlistGame[];
  providers: { google?: boolean; apple?: boolean };
};

export async function POST(request: NextRequest) {
  const session = await getSession();
  const body = (await request.json()) as CreateRequest;
  if (!isWishlistGameArray(body.games)) {
    return NextResponse.json({ error: "Invalid games payload." }, { status: 400 });
  }
  const events = body.games
    .map(gameToEvent)
    .filter((event): event is NonNullable<ReturnType<typeof gameToEvent>> =>
      Boolean(event),
    );
  const result = {
    google: { attempted: false, created: 0, skipped: 0, error: "" },
    apple: { attempted: Boolean(body.providers.apple), downloadReady: false },
  };

  if (body.providers.google) {
    result.google.attempted = true;
    if (!session.googleConnected || !session.googleAccessToken) {
      result.google.error = "Google account is not connected.";
    } else {
      let firstGoogleError = "";
      const inserts = await Promise.all(
        events.map(async (event, index) => {
          const payload = toGoogleEventPayload(event);
          const res = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.googleAccessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            },
          );
          if (index < 3) {
            const bodyText = await res.text();
            if (!res.ok && !firstGoogleError) {
              firstGoogleError = bodyText.slice(0, 300);
            }
            return res.ok;
          }
          return res.ok;
        }),
      );
      result.google.created = inserts.filter(Boolean).length;
      result.google.skipped = events.length - result.google.created;
      if (result.google.skipped > 0 && firstGoogleError) {
        result.google.error =
          "Google API rejected event creation. Check Google Calendar API enablement and OAuth project settings.";
      }
    }
  }

  if (body.providers.apple) {
    result.apple.downloadReady = true;
  }

  return NextResponse.json(result);
}
