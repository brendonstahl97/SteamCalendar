import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as steamCallback } from "@/app/api/steam/callback/route";
import { GET as googleCallback } from "@/app/api/google/callback/route";
import { encryptSessionData } from "@/lib/session";
import { TEST_ENV, TEST_SESSION_SECRET } from "../helpers/env";
import { getSessionCookie, resetCookieJar, setSessionCookie } from "../helpers/cookie-jar";

describe("OAuth callbacks", () => {
  beforeEach(() => {
    resetCookieJar();
    vi.unstubAllGlobals();
  });

  it("redirects steam success to auth complete page", async () => {
    setSessionCookie(
      encryptSessionData({ oauthStates: { steam: "state-abc" } }, TEST_SESSION_SECRET),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("is_valid:true")),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/steam/callback?state=state-abc&openid.claimed_id=https://steamcommunity.com/openid/id/76561198000000000",
    );
    const response = await steamCallback(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${TEST_ENV.APP_BASE_URL}/auth/complete?provider=steam&status=connected`,
    );
    expect(getSessionCookie()).toBeTruthy();
  });

  it("redirects steam failure on invalid state", async () => {
    setSessionCookie(
      encryptSessionData({ oauthStates: { steam: "expected" } }, TEST_SESSION_SECRET),
    );
    const request = new NextRequest(
      "http://localhost:3000/api/steam/callback?state=wrong",
    );
    const response = await steamCallback(request);
    expect(response.headers.get("location")).toBe(
      `${TEST_ENV.APP_BASE_URL}/auth/complete?provider=steam&status=error`,
    );
  });

  it("redirects google success to auth complete page", async () => {
    setSessionCookie(
      encryptSessionData({ oauthStates: { google: "google-state" } }, TEST_SESSION_SECRET),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/google/callback?state=google-state&code=auth-code",
    );
    const response = await googleCallback(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${TEST_ENV.APP_BASE_URL}/auth/complete?provider=google&status=connected`,
    );
  });

  it("redirects google failure on invalid state", async () => {
    setSessionCookie(
      encryptSessionData({ oauthStates: { google: "expected" } }, TEST_SESSION_SECRET),
    );
    const request = new NextRequest(
      "http://localhost:3000/api/google/callback?state=wrong&code=auth-code",
    );
    const response = await googleCallback(request);
    expect(response.headers.get("location")).toBe(
      `${TEST_ENV.APP_BASE_URL}/auth/complete?provider=google&status=error`,
    );
  });
});
