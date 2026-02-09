import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Supabase mock ───────────────────────────────────────────────────────────

type MockResult = { data: unknown; error: null };

let tableData: Record<string, unknown[]>;

function chainable(result: MockResult) {
  const self = {
    select: () => self,
    eq: () => self,
    in: () => self,
    gte: () => self,
    lt: () => self,
    // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for await support
    then: (resolve: (v: MockResult) => void) =>
      Promise.resolve(result).then(resolve),
  };
  return self;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      from: (table: string) => {
        const rows = tableData[table] ?? [];
        return chainable({ data: rows, error: null });
      },
    }),
}));

const { getDailyStats } = await import("../daily-stats");

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getDailyStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-08T15:00:00Z"));
    tableData = {
      categories: [],
      flashcards: [],
      review_logs: [],
      user_card_state: [],
    };
  });

  it("no reviews today returns all zeros", async () => {
    tableData = {
      categories: [{ id: "cat-1" }],
      flashcards: [{ id: "f-1" }],
      review_logs: [],
      user_card_state: [],
    };

    const stats = await getDailyStats("user-1", "theme-1");
    expect(stats.reviewsToday).toBe(0);
    expect(stats.newCardsToday).toBe(0);
    expect(stats.correctRate).toBeNull();
    expect(stats.avgAnswerTimeMs).toBeNull();
    expect(stats.dueTomorrow).toBe(0);
  });

  it("5 reviews (3 correct, 2 again) returns correct counts", async () => {
    tableData = {
      categories: [{ id: "cat-1" }],
      flashcards: [
        { id: "f-1" },
        { id: "f-2" },
        { id: "f-3" },
        { id: "f-4" },
        { id: "f-5" },
      ],
      review_logs: [
        {
          rating: 3,
          answer_time_ms: 2000,
          stability_before: 5.0,
        },
        {
          rating: 4,
          answer_time_ms: 1500,
          stability_before: 3.0,
        },
        {
          rating: 3,
          answer_time_ms: 3000,
          stability_before: 2.0,
        },
        {
          rating: 1,
          answer_time_ms: 4000,
          stability_before: 1.0,
        },
        {
          rating: 1,
          answer_time_ms: 5000,
          stability_before: 0.5,
        },
      ],
      user_card_state: [],
    };

    const stats = await getDailyStats("user-1", "theme-1");
    expect(stats.reviewsToday).toBe(5);
    expect(stats.correctRate).toBeCloseTo(3 / 5);
  });

  it("new cards counted by stability_before null", async () => {
    tableData = {
      categories: [{ id: "cat-1" }],
      flashcards: [{ id: "f-1" }, { id: "f-2" }, { id: "f-3" }],
      review_logs: [
        { rating: 3, answer_time_ms: 2000, stability_before: null }, // new
        { rating: 3, answer_time_ms: 1500, stability_before: null }, // new
        { rating: 3, answer_time_ms: 3000, stability_before: 5.0 }, // not new
      ],
      user_card_state: [],
    };

    const stats = await getDailyStats("user-1", "theme-1");
    expect(stats.newCardsToday).toBe(2);
  });

  it("average answer time computed correctly", async () => {
    tableData = {
      categories: [{ id: "cat-1" }],
      flashcards: [{ id: "f-1" }, { id: "f-2" }, { id: "f-3" }],
      review_logs: [
        { rating: 3, answer_time_ms: 1000, stability_before: 1.0 },
        { rating: 3, answer_time_ms: 2000, stability_before: 2.0 },
        { rating: 3, answer_time_ms: 3000, stability_before: 3.0 },
      ],
      user_card_state: [],
    };

    const stats = await getDailyStats("user-1", "theme-1");
    expect(stats.avgAnswerTimeMs).toBe(2000);
  });

  it("due tomorrow count", async () => {
    // Tomorrow is 2026-02-09 (system time is 2026-02-08T15:00:00Z)
    tableData = {
      categories: [{ id: "cat-1" }],
      flashcards: [{ id: "f-1" }, { id: "f-2" }],
      review_logs: [],
      user_card_state: [
        { id: "cs-1" }, // mock: the chain returns all rows
        { id: "cs-2" },
        { id: "cs-3" },
      ],
    };

    const stats = await getDailyStats("user-1", "theme-1");
    expect(stats.dueTomorrow).toBe(3);
  });
});
