import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/session/route";
import { encryptSessionData } from "@/lib/session";
import { TEST_SESSION_SECRET } from "../helpers/env";
import { resetCookieJar, setSessionCookie } from "../helpers/cookie-jar";

describe("GET /api/session", () => {
  beforeEach(() => {
    resetCookieJar();
  });

  it("returns disconnected session by default", async () => {
    const response = await GET();
    const data = await response.json();
    expect(data).toEqual({
      steamConnected: false,
      steamId: null,
    });
  });

  it("returns steam session when connected", async () => {
    setSessionCookie(
      encryptSessionData(
        { steamConnected: true, steamId: "76561198000000000" },
        TEST_SESSION_SECRET,
      ),
    );
    const response = await GET();
    const data = await response.json();
    expect(data.steamConnected).toBe(true);
    expect(data.steamId).toBe("76561198000000000");
  });
});
