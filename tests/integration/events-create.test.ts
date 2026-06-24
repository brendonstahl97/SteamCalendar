import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/events/create/route";
import { encryptSessionData } from "@/lib/session";
import { resetRateLimits } from "@/lib/rate-limit";
import { TEST_SESSION_SECRET } from "../helpers/env";
import { resetCookieJar, setSessionCookie } from "../helpers/cookie-jar";

const mockResolve = vi.fn();

vi.mock("@/lib/integrations/steam", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/integrations/steam")>();
  return {
    ...actual,
    resolveWishlistGamesByAppIds: (...args: unknown[]) => mockResolve(...args),
  };
});

const futureGame = {
  appId: 100,
  name: "Future Game",
  releaseDateText: "Jan 15, 2030",
  releaseDate: "2030-01-15",
  releaseDateUnix: Math.floor(Date.now() / 1000) + 86_400,
  storeUrl: "https://store.steampowered.com/app/100",
};

function authedRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/events/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "content-length": String(JSON.stringify(body).length),
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events/create", () => {
  beforeEach(() => {
    resetCookieJar();
    resetRateLimits();
    mockResolve.mockReset();
    mockResolve.mockResolvedValue([futureGame]);
    vi.unstubAllGlobals();
  });

  it("returns 401 when steam is not connected", async () => {
    const response = await POST(
      authedRequest({ appIds: [100], providers: { ics: true } }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid appIds", async () => {
    setSessionCookie(
      encryptSessionData(
        { steamConnected: true, steamId: "steam-user" },
        TEST_SESSION_SECRET,
      ),
    );
    const response = await POST(
      authedRequest({ appIds: [], providers: { ics: true } }),
    );
    expect(response.status).toBe(400);
  });

  it("flags ics download when eligible games exist", async () => {
    setSessionCookie(
      encryptSessionData(
        { steamConnected: true, steamId: "steam-user" },
        TEST_SESSION_SECRET,
      ),
    );
    const response = await POST(
      authedRequest({ appIds: [100], providers: { ics: true } }),
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ics).toEqual({ attempted: true, downloadReady: true });
  });

  it("returns 429 when rate limited", async () => {
    setSessionCookie(
      encryptSessionData(
        { steamConnected: true, steamId: "steam-user" },
        TEST_SESSION_SECRET,
      ),
    );
    for (let i = 0; i < 10; i += 1) {
      await POST(authedRequest({ appIds: [100], providers: { ics: true } }));
    }
    const response = await POST(
      authedRequest({ appIds: [100], providers: { ics: true } }),
    );
    expect(response.status).toBe(429);
  });

  it("reports expired google token", async () => {
    setSessionCookie(
      encryptSessionData(
        {
          steamConnected: true,
          steamId: "steam-user",
          googleConnected: true,
          googleAccessToken: "access-token",
          googleTokenExpiresAt: Date.now() - 1,
        },
        TEST_SESSION_SECRET,
      ),
    );
    const response = await POST(
      authedRequest({ appIds: [100], providers: { google: true } }),
    );
    const data = await response.json();
    expect(data.google.error).toContain("expired");
  });

  it("creates google events when token is valid", async () => {
    setSessionCookie(
      encryptSessionData(
        {
          steamConnected: true,
          steamId: "steam-user",
          googleConnected: true,
          googleAccessToken: "access-token",
          googleTokenExpiresAt: Date.now() + 60_000,
        },
        TEST_SESSION_SECRET,
      ),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    const response = await POST(
      authedRequest({ appIds: [100], providers: { google: true } }),
    );
    const data = await response.json();
    expect(data.google.created).toBe(1);
    expect(data.google.skipped).toBe(0);
  });
});
