import { afterEach, describe, expect, it } from "vitest";
import { getEnv } from "@/lib/env";
import { TEST_ENV } from "@/tests/helpers/env";

describe("getEnv", () => {
  afterEach(() => {
    for (const [key, value] of Object.entries(TEST_ENV)) {
      process.env[key] = value;
    }
  });

  it("returns required env when valid", () => {
    const env = getEnv();
    expect(env.APP_BASE_URL).toBe(TEST_ENV.APP_BASE_URL);
    expect(env.SESSION_SECRET).toBe(TEST_ENV.SESSION_SECRET);
  });

  it("throws when a required variable is missing", () => {
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(() => getEnv()).toThrow("Missing required environment variable");
  });

  it("throws when SESSION_SECRET is not 64 hex chars", () => {
    process.env.SESSION_SECRET = "too-short";
    expect(() => getEnv()).toThrow("SESSION_SECRET must be 64 hex characters");
  });
});
