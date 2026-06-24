import { describe, expect, it } from "vitest";
import { assertOAuthState } from "@/lib/auth-state";

describe("oauth state guard", () => {
  it("accepts matching state", () => {
    expect(() =>
      assertOAuthState({ oauthStates: { steam: "abc123" } }, "steam", "abc123"),
    ).not.toThrow();
  });

  it("rejects mismatched state", () => {
    expect(() =>
      assertOAuthState({ oauthStates: { google: "right" } }, "google", "wrong"),
    ).toThrow("Invalid OAuth state.");
  });
});
