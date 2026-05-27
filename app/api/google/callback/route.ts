import { NextRequest, NextResponse } from "next/server";
import { assertOAuthState } from "@/lib/auth-state";
import { getEnv } from "@/lib/env";
import { getSession, setSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const env = getEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  try {
    const session = await getSession();
    assertOAuthState(session, "google", url.searchParams.get("state"));
    if (!code) {
      throw new Error("Missing code.");
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.APP_BASE_URL}/api/google/callback`,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!tokenRes.ok) {
      throw new Error("Google token exchange failed.");
    }
    const tokens = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
    };

    await setSession({
      ...session,
      googleConnected: true,
      googleAccessToken: tokens.access_token,
      googleTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
      oauthStates: { ...(session.oauthStates ?? {}), google: "" },
    });

    return NextResponse.redirect(`${env.APP_BASE_URL}?google=connected`);
  } catch {
    return NextResponse.redirect(`${env.APP_BASE_URL}?google=error`);
  }
}
