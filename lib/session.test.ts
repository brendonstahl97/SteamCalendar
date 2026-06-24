import { describe, expect, it } from "vitest";
import {
  decryptSessionData,
  encryptSessionData,
  type SessionData,
} from "@/lib/session";
import { TEST_SESSION_SECRET } from "@/tests/helpers/env";

describe("session crypto", () => {
  const sample: SessionData = {
    steamConnected: true,
    steamId: "76561198000000000",
    googleConnected: false,
  };

  it("roundtrips session data", () => {
    const encrypted = encryptSessionData(sample, TEST_SESSION_SECRET);
    const decrypted = decryptSessionData(encrypted, TEST_SESSION_SECRET);
    expect(decrypted).toEqual(sample);
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSessionData(sample, TEST_SESSION_SECRET);
    const tampered = `${encrypted.slice(0, -4)}aaaa`;
    expect(() => decryptSessionData(tampered, TEST_SESSION_SECRET)).toThrow();
  });

  it("rejects wrong secret", () => {
    const encrypted = encryptSessionData(sample, TEST_SESSION_SECRET);
    const wrongSecret =
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    expect(() => decryptSessionData(encrypted, wrongSecret)).toThrow();
  });
});
