import { describe, expect, it } from "vitest";
import { getIntervalPreviews } from "../interval-preview";

describe("getIntervalPreviews with user settings", () => {
  it("default settings produce results", () => {
    const previews = getIntervalPreviews(null);
    expect(previews[1]).toBeDefined();
    expect(previews[2]).toBeDefined();
    expect(previews[3]).toBeDefined();
    expect(previews[4]).toBeDefined();
    // All should be non-empty strings
    expect(typeof previews[1]).toBe("string");
    expect(previews[1].length).toBeGreaterThan(0);
  });

  it("lower retention (0.80) produces different intervals than higher (0.95)", () => {
    const low = getIntervalPreviews(null, {
      desired_retention: 0.8,
      max_review_interval: 36500,
    });
    const high = getIntervalPreviews(null, {
      desired_retention: 0.95,
      max_review_interval: 36500,
    });

    // For a new card, Again and Hard intervals are short learning steps
    // that may be the same. But at least one rating should differ
    // when retention differs (Easy on a new card produces different intervals).
    const anyDifference =
      low[1] !== high[1] ||
      low[2] !== high[2] ||
      low[3] !== high[3] ||
      low[4] !== high[4];
    expect(anyDifference).toBe(true);
  });

  it("getIntervalPreviews with null cardState returns valid results", () => {
    const previews = getIntervalPreviews(null);
    // Should return interval strings for all 4 ratings
    for (const rating of [1, 2, 3, 4] as const) {
      expect(typeof previews[rating]).toBe("string");
      expect(previews[rating].length).toBeGreaterThan(0);
      // Should match format like "1m", "10m", "1h", "1d", "1mo"
      expect(previews[rating]).toMatch(/^\d+(?:m|h|d|mo)$/);
    }
  });
});
