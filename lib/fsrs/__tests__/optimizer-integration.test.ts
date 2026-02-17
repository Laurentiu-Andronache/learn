import { describe, expect, it } from "vitest";
import {
  transformReviewLogs,
  type PlainFSRSItem,
} from "../optimizer";

/** Helper to build a review log row */
function makeLog(overrides: {
  flashcard_id: string;
  rating: number;
  elapsed_days_before: number | null;
  scheduled_days_before: number | null;
  stability_before: number | null;
  reviewed_at: string;
}) {
  return overrides;
}

describe("transformReviewLogs", () => {
  describe("basic transformation (2 cards, 3 reviews each, all with positive delta_t)", () => {
    const logs = [
      // Card A — 3 reviews
      makeLog({
        flashcard_id: "card-a",
        rating: 3,
        elapsed_days_before: null,
        scheduled_days_before: null,
        stability_before: null,
        reviewed_at: "2026-01-01T10:00:00Z",
      }),
      makeLog({
        flashcard_id: "card-a",
        rating: 3,
        elapsed_days_before: 1,
        scheduled_days_before: 1,
        stability_before: 4.5,
        reviewed_at: "2026-01-02T10:00:00Z",
      }),
      makeLog({
        flashcard_id: "card-a",
        rating: 2,
        elapsed_days_before: 5,
        scheduled_days_before: 5,
        stability_before: 8.2,
        reviewed_at: "2026-01-07T10:00:00Z",
      }),
      // Card B — 3 reviews
      makeLog({
        flashcard_id: "card-b",
        rating: 3,
        elapsed_days_before: null,
        scheduled_days_before: null,
        stability_before: null,
        reviewed_at: "2026-01-01T11:00:00Z",
      }),
      makeLog({
        flashcard_id: "card-b",
        rating: 4,
        elapsed_days_before: 2,
        scheduled_days_before: 2,
        stability_before: 5.0,
        reviewed_at: "2026-01-03T11:00:00Z",
      }),
      makeLog({
        flashcard_id: "card-b",
        rating: 1,
        elapsed_days_before: 10,
        scheduled_days_before: 10,
        stability_before: 12.0,
        reviewed_at: "2026-01-13T11:00:00Z",
      }),
    ];

    let items: PlainFSRSItem[];

    it("produces 4 items (only prefixes with at least one delta_t > 0)", () => {
      items = transformReviewLogs(logs);
      // Card A: prefix 1 (delta_t=0 only) → filtered out, prefix 2 (has delta_t=1) → included, prefix 3 (has delta_t=1,5) → included
      // Card B: prefix 1 (delta_t=0 only) → filtered out, prefix 2 (has delta_t=2) → included, prefix 3 (has delta_t=2,10) → included
      expect(items).toHaveLength(4);
    });

    it("first included item has 2 reviews (first card, second prefix)", () => {
      items = transformReviewLogs(logs);
      // Card A prefix #2 (the first valid item)
      expect(items[0].reviews).toHaveLength(2);
      expect(items[0].reviews[0].delta_t).toBe(0);
      expect(items[0].reviews[1].delta_t).toBe(1);
    });

    it("subsequent reviews use elapsed_days_before for delta_t", () => {
      items = transformReviewLogs(logs);
      // Card A prefix #3 (index 1) — 3 reviews
      expect(items[1].reviews).toHaveLength(3);
      expect(items[1].reviews[2].delta_t).toBe(5); // elapsed_days_before = 5

      // Card B prefix #2 (index 2) — 2 reviews
      expect(items[2].reviews).toHaveLength(2);
      expect(items[2].reviews[1].delta_t).toBe(2); // elapsed_days_before = 2

      // Card B prefix #3 (index 3) — 3 reviews
      expect(items[3].reviews).toHaveLength(3);
      expect(items[3].reviews[2].delta_t).toBe(10); // elapsed_days_before = 10
    });

    it("preserves ratings correctly", () => {
      items = transformReviewLogs(logs);
      // Card A full prefix: ratings 3, 3, 2
      expect(items[1].reviews.map((r) => r.rating)).toEqual([3, 3, 2]);
      // Card B full prefix: ratings 3, 4, 1
      expect(items[3].reviews.map((r) => r.rating)).toEqual([3, 4, 1]);
    });

    it("each prefix is an incremental slice of the card's history", () => {
      items = transformReviewLogs(logs);
      // Card A valid prefixes: 2 → 3 reviews
      expect(items[0].reviews).toHaveLength(2);
      expect(items[1].reviews).toHaveLength(3);
      // Card B valid prefixes: 2 → 3 reviews
      expect(items[2].reviews).toHaveLength(2);
      expect(items[3].reviews).toHaveLength(3);
    });
  });

  describe("sorts by reviewed_at within each card", () => {
    it("handles out-of-order logs correctly", () => {
      // Provide logs in reverse chronological order
      const logs = [
        makeLog({
          flashcard_id: "card-x",
          rating: 2,
          elapsed_days_before: 3,
          scheduled_days_before: 3,
          stability_before: 6.0,
          reviewed_at: "2026-01-04T10:00:00Z",
        }),
        makeLog({
          flashcard_id: "card-x",
          rating: 3,
          elapsed_days_before: null,
          scheduled_days_before: null,
          stability_before: null,
          reviewed_at: "2026-01-01T10:00:00Z",
        }),
      ];

      const items = transformReviewLogs(logs);
      // Only 1 valid item (the 2-review prefix with delta_t=3 > 0)
      expect(items).toHaveLength(1);
      expect(items[0].reviews[0].delta_t).toBe(0);
      expect(items[0].reviews[0].rating).toBe(3);
      expect(items[0].reviews[1].delta_t).toBe(3);
      expect(items[0].reviews[1].rating).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("returns empty array for empty logs", () => {
      const items = transformReviewLogs([]);
      expect(items).toEqual([]);
    });

    it("single card with single review produces 0 items (no positive delta_t)", () => {
      const logs = [
        makeLog({
          flashcard_id: "card-only",
          rating: 3,
          elapsed_days_before: null,
          scheduled_days_before: null,
          stability_before: null,
          reviewed_at: "2026-02-10T08:00:00Z",
        }),
      ];

      const items = transformReviewLogs(logs);
      // Single review only has delta_t=0 → filtered out
      expect(items).toHaveLength(0);
    });

    it("handles null elapsed_days_before on non-first review (falls back to 0, both filtered out)", () => {
      const logs = [
        makeLog({
          flashcard_id: "card-null",
          rating: 3,
          elapsed_days_before: null,
          scheduled_days_before: null,
          stability_before: null,
          reviewed_at: "2026-01-01T10:00:00Z",
        }),
        makeLog({
          flashcard_id: "card-null",
          rating: 3,
          elapsed_days_before: null, // unexpected null, but code handles it
          scheduled_days_before: null,
          stability_before: 4.0, // not null → not first review
          reviewed_at: "2026-01-02T10:00:00Z",
        }),
      ];

      const items = transformReviewLogs(logs);
      // Both reviews have delta_t=0 (first is new, second has null elapsed → 0)
      // No prefix has a positive delta_t → all filtered out
      expect(items).toHaveLength(0);
    });

    it("cards with only same-day reviews are excluded", () => {
      const logs = [
        makeLog({
          flashcard_id: "card-same-day",
          rating: 3,
          elapsed_days_before: null,
          scheduled_days_before: null,
          stability_before: null,
          reviewed_at: "2026-01-01T10:00:00Z",
        }),
        makeLog({
          flashcard_id: "card-same-day",
          rating: 3,
          elapsed_days_before: 0,
          scheduled_days_before: 0,
          stability_before: 2.3,
          reviewed_at: "2026-01-01T10:30:00Z",
        }),
        makeLog({
          flashcard_id: "card-same-day",
          rating: 3,
          elapsed_days_before: 0,
          scheduled_days_before: 0,
          stability_before: 2.3,
          reviewed_at: "2026-01-01T11:00:00Z",
        }),
      ];

      const items = transformReviewLogs(logs);
      // All delta_t are 0 → no valid items
      expect(items).toHaveLength(0);
    });

    it("includes items once a card gets a positive delta_t review", () => {
      const logs = [
        makeLog({
          flashcard_id: "card-mixed",
          rating: 3,
          elapsed_days_before: null,
          scheduled_days_before: null,
          stability_before: null,
          reviewed_at: "2026-01-01T10:00:00Z",
        }),
        makeLog({
          flashcard_id: "card-mixed",
          rating: 3,
          elapsed_days_before: 0,
          scheduled_days_before: 0,
          stability_before: 2.3,
          reviewed_at: "2026-01-01T10:30:00Z",
        }),
        makeLog({
          flashcard_id: "card-mixed",
          rating: 2,
          elapsed_days_before: 2,
          scheduled_days_before: 2,
          stability_before: 2.3,
          reviewed_at: "2026-01-03T10:00:00Z",
        }),
      ];

      const items = transformReviewLogs(logs);
      // Only the 3rd prefix (3 reviews) has delta_t=2 > 0
      expect(items).toHaveLength(1);
      expect(items[0].reviews).toHaveLength(3);
      expect(items[0].reviews[2].delta_t).toBe(2);
    });
  });
});
