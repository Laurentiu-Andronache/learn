import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within limit", () => {
    const isLimited = createRateLimiter(3, 60_000);
    expect(isLimited("user1")).toBe(false);
    expect(isLimited("user1")).toBe(false);
    expect(isLimited("user1")).toBe(false);
  });

  it("blocks when limit exceeded", () => {
    const isLimited = createRateLimiter(2, 60_000);
    expect(isLimited("user1")).toBe(false);
    expect(isLimited("user1")).toBe(false);
    expect(isLimited("user1")).toBe(true);
  });

  it("tracks users independently", () => {
    const isLimited = createRateLimiter(1, 60_000);
    expect(isLimited("user1")).toBe(false);
    expect(isLimited("user1")).toBe(true);
    expect(isLimited("user2")).toBe(false);
  });

  it("resets after window expires", () => {
    const isLimited = createRateLimiter(1, 60_000);
    expect(isLimited("user1")).toBe(false);
    expect(isLimited("user1")).toBe(true);
    vi.advanceTimersByTime(60_001);
    expect(isLimited("user1")).toBe(false);
  });

  it("creates independent limiters", () => {
    const limiterA = createRateLimiter(1, 60_000);
    const limiterB = createRateLimiter(1, 60_000);
    expect(limiterA("user1")).toBe(false);
    expect(limiterA("user1")).toBe(true);
    expect(limiterB("user1")).toBe(false);
  });
});
