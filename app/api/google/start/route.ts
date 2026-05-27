import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getSession, newOAuthState, setSession } from "@/lib/session";

const GOOGLE_OAUTH = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET() {
  const env = getEnv();
  const state = newOAuthState();
  const session = await getSession();
  await setSession({
    ...session,
    oauthStates: { ...(session.oauthStates ?? {}), google: state },
  });

  const callback = `${env.APP_BASE_URL}/api/google/callback`;
  const url = new URL(GOOGLE_OAUTH);
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  return NextResponse.redirect(url);
}
