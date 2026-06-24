import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getSession, newOAuthState, setSession } from "@/lib/session";

const STEAM_OPENID = "https://steamcommunity.com/openid/login";

export async function GET() {
  const env = getEnv();
  const callback = `${env.APP_BASE_URL}/api/steam/callback`;
  const state = newOAuthState();
  const session = await getSession();
  await setSession({
    ...session,
    oauthStates: { ...(session.oauthStates ?? {}), steam: state },
  });

  const url = new URL(STEAM_OPENID);
  url.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.return_to", `${callback}?state=${state}`);
  url.searchParams.set("openid.realm", env.STEAM_REALM);
  url.searchParams.set(
    "openid.identity",
    "http://specs.openid.net/auth/2.0/identifier_select",
  );
  url.searchParams.set(
    "openid.claimed_id",
    "http://specs.openid.net/auth/2.0/identifier_select",
  );

  return NextResponse.redirect(url);
}
