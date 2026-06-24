import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("rate limit", () => {
  afterEach(() => {
    resetRateLimits();
    vi.useRealTimers();
  });

  it("allows requests within the limit", () => {
    const first = checkRateLimit("test-key", 3, 60_000);
    const second = checkRateLimit("test-key", 3, 60_000);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    checkRateLimit("block-key", 2, 60_000);
    checkRateLimit("block-key", 2, 60_000);
    const third = checkRateLimit("block-key", 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    checkRateLimit("window-key", 1, 1_000);
    const blocked = checkRateLimit("window-key", 1, 1_000);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(1_001);
    const afterWindow = checkRateLimit("window-key", 1, 1_000);
    expect(afterWindow.allowed).toBe(true);
  });
});
