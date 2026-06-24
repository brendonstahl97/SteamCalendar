import { NextRequest, NextResponse } from "next/server";
import { gameToEvent, toGoogleEventPayload } from "@/lib/integrations/events";
import { resolveWishlistGamesByAppIds } from "@/lib/integrations/steam";
import { MAX_JSON_BODY_BYTES } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSession, setSession } from "@/lib/session";
import { isAppIdArray } from "@/lib/validation";

type CreateRequest = {
  appIds: number[];
  providers: { google?: boolean; ics?: boolean };
};

const GOOGLE_INSERT_CONCURRENCY = 3;

function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function insertGoogleEvents(accessToken: string, events: ReturnType<typeof gameToEvent>[]) {
  const validEvents = events.filter(
    (event): event is NonNullable<ReturnType<typeof gameToEvent>> => Boolean(event),
  );
  let created = 0;
  let firstGoogleError = "";

  for (let i = 0; i < validEvents.length; i += GOOGLE_INSERT_CONCURRENCY) {
    const batch = validEvents.slice(i, i + GOOGLE_INSERT_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (event) => {
        const payload = toGoogleEventPayload(event);
        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );
        const bodyText = await res.text();
        if (!res.ok && !firstGoogleError) {
          firstGoogleError = bodyText.slice(0, 300);
        }
        return res.ok;
      }),
    );
    created += results.filter(Boolean).length;
  }

  return {
    created,
    skipped: validEvents.length - created,
    error:
      created < validEvents.length && firstGoogleError
        ? "Google API rejected event creation. Check Google Calendar API enablement and OAuth project settings."
        : "",
  };
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`create:${clientKey(request)}`, 10, 60_000);
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

  const body = (await request.json()) as CreateRequest;
  if (!isAppIdArray(body.appIds)) {
    return NextResponse.json({ error: "Invalid appIds payload." }, { status: 400 });
  }

  const games = await resolveWishlistGamesByAppIds(session.steamId, body.appIds);
  const events = games
    .map(gameToEvent)
    .filter((event): event is NonNullable<ReturnType<typeof gameToEvent>> =>
      Boolean(event),
    );

  const result = {
    google: { attempted: false, created: 0, skipped: 0, error: "" },
    ics: { attempted: Boolean(body.providers.ics), downloadReady: false },
  };

  if (body.providers.google) {
    result.google.attempted = true;
    const tokenExpired =
      session.googleTokenExpiresAt !== undefined &&
      session.googleTokenExpiresAt <= Date.now();

    if (!session.googleConnected || !session.googleAccessToken) {
      result.google.error = "Google account is not connected.";
    } else if (tokenExpired) {
      result.google.error = "Google session expired. Reconnect Google and try again.";
    } else if (events.length === 0) {
      result.google.error = "No eligible games found for event creation.";
    } else {
      const googleResult = await insertGoogleEvents(session.googleAccessToken, events);
      result.google.created = googleResult.created;
      result.google.skipped = googleResult.skipped;
      result.google.error = googleResult.error;

      await setSession({
        ...session,
        googleAccessToken: undefined,
        googleTokenExpiresAt: undefined,
        googleConnected: false,
      });
    }
  }

  if (body.providers.ics && events.length > 0) {
    result.ics.downloadReady = true;
  }

  return NextResponse.json(result);
}
