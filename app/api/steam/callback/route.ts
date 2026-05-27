import { NextRequest, NextResponse } from "next/server";
import { assertOAuthState } from "@/lib/auth-state";
import { getEnv } from "@/lib/env";
import { getSession, setSession } from "@/lib/session";

function extractSteamId(claimedId: string | null): string {
  if (!claimedId) {
    throw new Error("Missing claimed id.");
  }
  const match =
    claimedId.match(/\/openid\/id\/(\d+)$/) ?? claimedId.match(/\/profiles\/(\d+)$/);
  if (!match?.[1]) {
    throw new Error("Could not parse Steam ID.");
  }
  return match[1];
}

async function verifySteamResponse(requestUrl: URL) {
  const params = requestUrl.searchParams;
  const body = new URLSearchParams();
  params.forEach((value, key) => body.set(key, value));
  body.set("openid.mode", "check_authentication");
  const verify = await fetch("https://steamcommunity.com/openid/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const text = await verify.text();
  if (!text.includes("is_valid:true")) {
    throw new Error("Steam OpenID validation failed.");
  }
}

export async function GET(request: NextRequest) {
  const env = getEnv();
  try {
    const requestUrl = new URL(request.url);
    const session = await getSession();
    assertOAuthState(session, "steam", requestUrl.searchParams.get("state"));
    await verifySteamResponse(requestUrl);
    const steamId = extractSteamId(requestUrl.searchParams.get("openid.claimed_id"));
    await setSession({
      ...session,
      steamConnected: true,
      steamId,
      oauthStates: { ...(session.oauthStates ?? {}), steam: "" },
    });
    return NextResponse.redirect(`${env.APP_BASE_URL}?steam=connected`);
  } catch {
    return NextResponse.redirect(`${env.APP_BASE_URL}?steam=error`);
  }
}
