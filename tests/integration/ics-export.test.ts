import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/ics/export/route";
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

function authedRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/ics/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "content-length": String(JSON.stringify(body).length),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ics/export", () => {
  beforeEach(() => {
    resetCookieJar();
    resetRateLimits();
    mockResolve.mockReset();
    mockResolve.mockResolvedValue([futureGame]);
  });

  it("returns 401 when steam is not connected", async () => {
    const response = await POST(authedRequest({ appIds: [100] }));
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid appIds", async () => {
    setSessionCookie(
      encryptSessionData(
        { steamConnected: true, steamId: "steam-user" },
        TEST_SESSION_SECRET,
      ),
    );
    const response = await POST(authedRequest({ appIds: [-1] }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when no eligible games are found", async () => {
    setSessionCookie(
      encryptSessionData(
        { steamConnected: true, steamId: "steam-user" },
        TEST_SESSION_SECRET,
      ),
    );
    mockResolve.mockResolvedValue([]);
    const response = await POST(authedRequest({ appIds: [100] }));
    expect(response.status).toBe(400);
  });

  it("returns valid ics content", async () => {
    setSessionCookie(
      encryptSessionData(
        { steamConnected: true, steamId: "steam-user" },
        TEST_SESSION_SECRET,
      ),
    );
    const response = await POST(authedRequest({ appIds: [100] }));
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/calendar");
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("Future Game");
  });
});
