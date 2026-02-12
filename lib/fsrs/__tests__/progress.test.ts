import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

import { getTopicProgress } from "../progress";

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper to set up the 3 chained queries getTopicProgress makes:
// 1. flashcards select (with categories join)
// 2. user_card_state select
// 3. suspended_flashcards select
function setupMocks(opts: {
  flashcards: unknown[] | null;
  cardStates: unknown[] | null;
  suspended: unknown[] | null;
}) {
  let callCount = 0;
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === "flashcards") {
      const returnsMock = vi.fn().mockResolvedValue({
        data: opts.flashcards,
        error: null,
      });
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            returns: returnsMock,
          }),
        }),
      };
    }
    if (table === "user_card_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: opts.cardStates,
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "suspended_flashcards") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: opts.suspended,
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  });
}

const makeCat = (topicId: string) => ({
  id: "cat-1",
  name_en: "Cat",
  name_es: "Cat",
  color: null,
  topic_id: topicId,
});

describe("getTopicProgress", () => {
  it("returns zero counts for empty topic", async () => {
    setupMocks({ flashcards: [], cardStates: [], suspended: [] });

    const result = await getTopicProgress("user-1", "topic-1");

    expect(result.total).toBe(0);
    expect(result.newCount).toBe(0);
    expect(result.learningCount).toBe(0);
    expect(result.reviewCount).toBe(0);
    expect(result.masteredCount).toBe(0);
    expect(result.dueToday).toBe(0);
    expect(result.fullyMemorized).toBe(false);
    expect(result.percentComplete).toBe(0);
    expect(result.categories).toEqual([]);
  });

  it("returns zero counts when flashcards is null", async () => {
    setupMocks({ flashcards: null, cardStates: null, suspended: null });

    const result = await getTopicProgress("user-1", "topic-1");
    expect(result.total).toBe(0);
  });

  it("counts unseen flashcards as new", async () => {
    setupMocks({
      flashcards: [
        { id: "f1", category_id: "cat-1", categories: makeCat("topic-1") },
        { id: "f2", category_id: "cat-1", categories: makeCat("topic-1") },
      ],
      cardStates: [], // no card states = all new
      suspended: [],
    });

    const result = await getTopicProgress("user-1", "topic-1");
    expect(result.total).toBe(2);
    expect(result.newCount).toBe(2);
  });

  it("classifies learning and relearning states", async () => {
    setupMocks({
      flashcards: [
        { id: "f1", category_id: "cat-1", categories: makeCat("topic-1") },
        { id: "f2", category_id: "cat-1", categories: makeCat("topic-1") },
      ],
      cardStates: [
        { flashcard_id: "f1", state: "learning", stability: 1, due: "2020-01-01T00:00:00Z", updated_at: "2026-01-01" },
        { flashcard_id: "f2", state: "relearning", stability: 2, due: "2020-01-01T00:00:00Z", updated_at: "2026-01-01" },
      ],
      suspended: [],
    });

    const result = await getTopicProgress("user-1", "topic-1");
    expect(result.learningCount).toBe(2);
  });

  it("classifies review (non-mastered) and mastered cards", async () => {
    setupMocks({
      flashcards: [
        { id: "f1", category_id: "cat-1", categories: makeCat("topic-1") },
        { id: "f2", category_id: "cat-1", categories: makeCat("topic-1") },
      ],
      cardStates: [
        { flashcard_id: "f1", state: "review", stability: 10, due: "2099-01-01T00:00:00Z", updated_at: "2026-01-01" },
        { flashcard_id: "f2", state: "review", stability: 50, due: "2099-01-01T00:00:00Z", updated_at: "2026-01-01" },
      ],
      suspended: [],
    });

    const result = await getTopicProgress("user-1", "topic-1");
    expect(result.reviewCount).toBe(1); // stability 10 < 30
    expect(result.masteredCount).toBe(1); // stability 50 > 30
  });

  it("excludes suspended flashcards from counts", async () => {
    setupMocks({
      flashcards: [
        { id: "f1", category_id: "cat-1", categories: makeCat("topic-1") },
        { id: "f2", category_id: "cat-1", categories: makeCat("topic-1") },
      ],
      cardStates: [],
      suspended: [{ flashcard_id: "f1" }],
    });

    const result = await getTopicProgress("user-1", "topic-1");
    expect(result.total).toBe(1); // f1 excluded
    expect(result.newCount).toBe(1);
  });

  it("counts dueToday for all overdue cards (review, relearning, learning)", async () => {
    setupMocks({
      flashcards: [
        { id: "f1", category_id: "cat-1", categories: makeCat("topic-1") },
        { id: "f2", category_id: "cat-1", categories: makeCat("topic-1") },
        { id: "f3", category_id: "cat-1", categories: makeCat("topic-1") },
        { id: "f4", category_id: "cat-1", categories: makeCat("topic-1") },
      ],
      cardStates: [
        { flashcard_id: "f1", state: "review", stability: 10, due: "2020-01-01T00:00:00Z", updated_at: "2026-01-01" },
        { flashcard_id: "f2", state: "relearning", stability: 2, due: "2020-01-01T00:00:00Z", updated_at: "2026-01-01" },
        { flashcard_id: "f3", state: "learning", stability: 1, due: "2020-01-01T00:00:00Z", updated_at: "2026-01-01" },
        // future review card does NOT count as dueToday
        { flashcard_id: "f4", state: "review", stability: 10, due: "2099-01-01T00:00:00Z", updated_at: "2026-01-01" },
      ],
      suspended: [],
    });

    const result = await getTopicProgress("user-1", "topic-1");
    expect(result.dueToday).toBe(3); // f1 (review) + f2 (relearning) + f3 (learning)
  });

  it("sets fullyMemorized when all cards mastered and none due", async () => {
    setupMocks({
      flashcards: [
        { id: "f1", category_id: "cat-1", categories: makeCat("topic-1") },
      ],
      cardStates: [
        { flashcard_id: "f1", state: "review", stability: 50, due: "2099-01-01T00:00:00Z", updated_at: "2026-01-01" },
      ],
      suspended: [],
    });

    const result = await getTopicProgress("user-1", "topic-1");
    expect(result.fullyMemorized).toBe(true);
    expect(result.percentComplete).toBe(100);
  });

  it("tracks lastStudied from most recent updated_at", async () => {
    setupMocks({
      flashcards: [
        { id: "f1", category_id: "cat-1", categories: makeCat("topic-1") },
        { id: "f2", category_id: "cat-1", categories: makeCat("topic-1") },
      ],
      cardStates: [
        { flashcard_id: "f1", state: "review", stability: 10, due: "2099-01-01T00:00:00Z", updated_at: "2026-01-10" },
        { flashcard_id: "f2", state: "review", stability: 10, due: "2099-01-01T00:00:00Z", updated_at: "2026-01-15" },
      ],
      suspended: [],
    });

    const result = await getTopicProgress("user-1", "topic-1");
    expect(result.lastStudied).toBe("2026-01-15");
  });
});
