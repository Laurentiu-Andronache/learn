import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserCardState } from "@/lib/types/database";

// ─── Supabase mock ───────────────────────────────────────────────────────────
// We mock the entire module so getOrderedFlashcards/getSubModeCounts get our fake client.

type MockResult = { data: unknown; error: null };

function chainable(result: MockResult) {
  const self = {
    select: () => self,
    eq: () => self,
    in: () => self,
    not: () => self,
    is: () => self,
    gte: () => self,
    order: () => self,
    limit: () => self,
    returns: () => self,
    single: () => Promise.resolve(result),
    // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for await support
    then: (resolve: (v: MockResult) => void) =>
      Promise.resolve(result).then(resolve),
  };
  // Make it thenable so `await query` works
  return self;
}

let tableData: Record<string, unknown[]>;

function createMockClient() {
  return {
    from: (table: string) => {
      const rows = tableData[table] ?? [];
      return chainable({ data: rows, error: null });
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(createMockClient()),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NOW = new Date("2026-02-08T12:00:00Z");

function makeFlashcard(id: string, categoryId = "cat-1") {
  return {
    id,
    category_id: categoryId,
    question_en: `Q ${id}`,
    question_es: `P ${id}`,
    answer_en: `A ${id}`,
    answer_es: `R ${id}`,
    extra_en: null,
    extra_es: null,
    difficulty: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    categories: {
      id: categoryId,
      name_en: "Cat",
      name_es: "Gato",
      color: "#fff",
      topic_id: "topic-1",
    },
  };
}

function makeCardState(
  flashcardId: string,
  state: UserCardState["state"],
  due: string,
  overrides: Partial<UserCardState> = {},
): UserCardState {
  return {
    id: `cs-${flashcardId}`,
    user_id: "user-1",
    flashcard_id: flashcardId,
    stability: 5,
    difficulty: 0.3,
    elapsed_days: 1,
    scheduled_days: 5,
    reps: 1,
    lapses: 0,
    state,
    last_review: "2026-02-07T12:00:00Z",
    due,
    learning_steps: 0,
    times_correct: 1,
    times_incorrect: 0,
    times_idk: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-02-07T12:00:00Z",
    ...overrides,
  };
}

// ─── Import after mocks ──────────────────────────────────────────────────────

const { getOrderedFlashcards, getSubModeCounts } = await import(
  "../flashcard-ordering"
);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getOrderedFlashcards – bucket sorting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("sorts: review due → new → learning due (future excluded)", async () => {
    const flashcards = [
      makeFlashcard("f-new"), // no card state → bucket 1
      makeFlashcard("f-learning"), // learning, due → bucket 2
      makeFlashcard("f-review"), // review, due → bucket 0
      makeFlashcard("f-future"), // review, future → bucket 3 (excluded)
    ];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-learning", "learning", "2026-02-08T11:50:00Z"), // due (10 min ago)
        makeCardState("f-review", "review", "2026-02-07T12:00:00Z"), // overdue (1 day)
        makeCardState("f-future", "review", "2026-02-10T12:00:00Z"), // future
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "full",
    });
    const ids = result.map((of) => of.flashcard.id);

    expect(ids).toHaveLength(3); // future card excluded
    expect(ids[0]).toBe("f-review"); // bucket 0
    expect(ids[1]).toBe("f-new"); // bucket 1
    expect(ids[2]).toBe("f-learning"); // bucket 2
  });

  it("sorts multiple review-due cards by most overdue first", async () => {
    const flashcards = [
      makeFlashcard("f-r1"),
      makeFlashcard("f-r2"),
      makeFlashcard("f-r3"),
    ];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-r1", "review", "2026-02-08T11:00:00Z"), // 1 hour overdue
        makeCardState("f-r2", "review", "2026-02-06T12:00:00Z"), // 2 days overdue (most)
        makeCardState("f-r3", "review", "2026-02-08T11:55:00Z"), // 5 min overdue
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "full",
    });
    const ids = result.map((of) => of.flashcard.id);

    expect(ids).toEqual(["f-r2", "f-r1", "f-r3"]);
  });

  it("treats relearning-due cards as bucket 0 (genuine review)", async () => {
    const flashcards = [makeFlashcard("f-new"), makeFlashcard("f-relearn")];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-relearn", "relearning", "2026-02-08T11:00:00Z"),
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "full",
    });
    expect(result[0].flashcard.id).toBe("f-relearn"); // bucket 0 before new
    expect(result[1].flashcard.id).toBe("f-new"); // bucket 1
  });

  it("new cards come before learning-due cards (the core bug fix)", async () => {
    // Simulate: user answered f-a, f-b 5 minutes ago → learning state, short due.
    // f-c, f-d are unseen. User returns — unseen should come first.
    const flashcards = [
      makeFlashcard("f-a"),
      makeFlashcard("f-b"),
      makeFlashcard("f-c"),
      makeFlashcard("f-d"),
    ];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-a", "learning", "2026-02-08T11:55:00Z"),
        makeCardState("f-b", "learning", "2026-02-08T11:56:00Z"),
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "full",
    });
    const ids = result.map((of) => of.flashcard.id);

    // New cards (f-c, f-d) are randomized but both before learning cards (f-a, f-b)
    const newIdx = ids.findIndex((id) => id === "f-c" || id === "f-d");
    const learningIdx = ids.findIndex((id) => id === "f-a" || id === "f-b");
    expect(newIdx).toBeLessThan(learningIdx);
  });

  it("excludes suspended flashcards", async () => {
    const flashcards = [makeFlashcard("f-1"), makeFlashcard("f-2")];

    tableData = {
      flashcards,
      suspended_flashcards: [{ flashcard_id: "f-1" }],
      user_card_state: [],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "full",
    });
    expect(result).toHaveLength(1);
    expect(result[0].flashcard.id).toBe("f-2");
  });

  it("applies limit option", async () => {
    const flashcards = Array.from({ length: 10 }, (_, i) =>
      makeFlashcard(`f-${i}`),
    );

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "full",
      limit: 3,
    });
    expect(result).toHaveLength(3);
  });

  it("returns empty array when no flashcards exist", async () => {
    tableData = {
      flashcards: [],
      suspended_flashcards: [],
      user_card_state: [],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "full",
    });
    expect(result).toEqual([]);
  });
});

describe("getOrderedFlashcards – spaced_repetition filter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("includes review-due and relearning-due cards", async () => {
    const flashcards = [makeFlashcard("f-review"), makeFlashcard("f-relearn")];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-review", "review", "2026-02-07T12:00:00Z"),
        makeCardState("f-relearn", "relearning", "2026-02-08T10:00:00Z"),
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "spaced_repetition",
    });
    const ids = result.map((of) => of.flashcard.id);
    expect(ids).toContain("f-review");
    expect(ids).toContain("f-relearn");
  });

  it("excludes learning-due cards from spaced_repetition", async () => {
    const flashcards = [makeFlashcard("f-learning"), makeFlashcard("f-review")];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-learning", "learning", "2026-02-08T11:50:00Z"), // due but learning
        makeCardState("f-review", "review", "2026-02-07T00:00:00Z"), // due and review
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "spaced_repetition",
    });
    const ids = result.map((of) => of.flashcard.id);
    expect(ids).toEqual(["f-review"]);
  });

  it("excludes new/unseen cards from spaced_repetition", async () => {
    const flashcards = [makeFlashcard("f-new")];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "spaced_repetition",
    });
    expect(result).toHaveLength(0);
  });

  it("excludes future review cards from spaced_repetition", async () => {
    const flashcards = [makeFlashcard("f-future")];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-future", "review", "2026-02-10T12:00:00Z"),
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "spaced_repetition",
    });
    expect(result).toHaveLength(0);
  });
});

describe("getOrderedFlashcards – quick_review filter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("excludes unseen cards", async () => {
    const flashcards = [makeFlashcard("f-seen"), makeFlashcard("f-unseen")];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-seen", "learning", "2026-02-09T12:00:00Z"),
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "quick_review",
    });
    expect(result).toHaveLength(1);
    expect(result[0].flashcard.id).toBe("f-seen");
  });

  it("limits to 20 by default", async () => {
    const flashcards = Array.from({ length: 30 }, (_, i) =>
      makeFlashcard(`f-${i}`),
    );

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: flashcards.map((f) =>
        makeCardState(f.id, "review", "2026-02-07T00:00:00Z"),
      ),
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "quick_review",
    });
    expect(result).toHaveLength(20);
  });
});

describe("getSubModeCounts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("returns correct counts (excludes future from full)", async () => {
    const flashcards = [
      { id: "f-1", categories: { topic_id: "topic-1" } },
      { id: "f-2", categories: { topic_id: "topic-1" } },
      { id: "f-3", categories: { topic_id: "topic-1" } },
      { id: "f-4", categories: { topic_id: "topic-1" } },
      { id: "f-5", categories: { topic_id: "topic-1" } }, // future card
    ];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        { flashcard_id: "f-1", due: "2026-02-07T00:00:00Z", state: "review" }, // due review
        { flashcard_id: "f-2", due: "2026-02-08T11:50:00Z", state: "learning" }, // due learning
        {
          flashcard_id: "f-3",
          due: "2026-02-08T11:00:00Z",
          state: "relearning",
        }, // due relearning
        // f-4 = new/unseen (no card state)
        { flashcard_id: "f-5", due: "2026-02-10T00:00:00Z", state: "review" }, // future review
      ],
    };

    const counts = await getSubModeCounts("user-1", "topic-1");
    expect(counts.full).toBe(4); // 3 due + 1 new, excludes future f-5
    expect(counts.quickReview).toBe(4); // min(4 seen, 20)
    expect(counts.spacedRepetition).toBe(2); // review + relearning, NOT learning
  });

  it("excludes suspended flashcards from full count", async () => {
    const flashcards = [
      { id: "f-1", categories: { topic_id: "topic-1" } },
      { id: "f-2", categories: { topic_id: "topic-1" } },
    ];

    tableData = {
      flashcards,
      suspended_flashcards: [{ flashcard_id: "f-1" }],
      user_card_state: [],
    };

    const counts = await getSubModeCounts("user-1", "topic-1");
    expect(counts.full).toBe(1);
  });

  it("returns zeros when no flashcards", async () => {
    tableData = {
      flashcards: [],
      suspended_flashcards: [],
      user_card_state: [],
    };

    const counts = await getSubModeCounts("user-1", "topic-1");
    expect(counts).toEqual({ full: 0, quickReview: 0, spacedRepetition: 0 });
  });
});

describe("getOrderedFlashcards – future card exclusion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("returns empty session when all cards are future", async () => {
    const flashcards = [makeFlashcard("f-1"), makeFlashcard("f-2")];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-1", "review", "2026-02-09T12:00:00Z"), // tomorrow
        makeCardState("f-2", "review", "2026-02-10T12:00:00Z"), // 2 days out
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "full",
    });
    expect(result).toHaveLength(0);
  });

  it("excludes future cards from category_focus mode too", async () => {
    const flashcards = [
      makeFlashcard("f-due", "cat-1"),
      makeFlashcard("f-future", "cat-1"),
    ];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-due", "review", "2026-02-07T12:00:00Z"), // overdue
        makeCardState("f-future", "review", "2026-02-10T12:00:00Z"), // future
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "category_focus",
      categoryId: "cat-1",
    });
    expect(result).toHaveLength(1);
    expect(result[0].flashcard.id).toBe("f-due");
  });

  it("quick_review keeps future seen cards", async () => {
    const flashcards = [makeFlashcard("f-future")];

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [
        makeCardState("f-future", "review", "2026-02-10T12:00:00Z"),
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "quick_review",
    });
    expect(result).toHaveLength(1);
  });
});

describe("getOrderedFlashcards – newCardsPerDay cap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("caps new cards to newCardsPerDay limit", async () => {
    const flashcards = Array.from({ length: 10 }, (_, i) =>
      makeFlashcard(`f-${i}`),
    );

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [],
      review_logs: [], // no reviews today
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "full",
      newCardsPerDay: 5,
    });
    expect(result).toHaveLength(5);
  });

  it("applies ramp-up limit on day 2", async () => {
    const flashcards = Array.from({ length: 15 }, (_, i) =>
      makeFlashcard(`f-${i}`),
    );

    tableData = {
      flashcards,
      suspended_flashcards: [],
      user_card_state: [],
      // Mock returns same rows for both review_logs queries:
      // 1) today's new cards → counts 1 (mock can't filter by date)
      // 2) earliest review → day 2 → ramp-up cap = min(10, 5+2) = 7
      // Result: 7 - 1 already studied = 6 remaining
      review_logs: [
        { flashcard_id: "f-0", reviewed_at: "2026-02-07T10:00:00Z" },
      ],
    };

    const result = await getOrderedFlashcards("user-1", "topic-1", {
      subMode: "full",
      newCardsPerDay: 10,
      newCardsRampUp: true,
    });
    expect(result).toHaveLength(6); // 7 ramp-up cap - 1 "studied today" from mock
  });
});
