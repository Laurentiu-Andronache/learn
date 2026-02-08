import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserCardState } from "@/lib/types/database";
import type { OrderedQuestion } from "../question-ordering";

// ─── Supabase mock ───────────────────────────────────────────────────────────
// We mock the entire module so getOrderedQuestions/getSubModeCounts get our fake client.

type MockResult = { data: unknown; error: null };

function chainable(result: MockResult) {
  const self = {
    select: () => self,
    eq: () => self,
    in: () => self,
    not: () => self,
    single: () => Promise.resolve(result),
    then: (resolve: (v: MockResult) => void) => Promise.resolve(result).then(resolve),
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

function makeQuestion(id: string, categoryId = "cat-1") {
  return {
    id,
    category_id: categoryId,
    type: "multiple_choice",
    question_en: `Q ${id}`,
    question_es: `P ${id}`,
    options_en: ["A", "B", "C", "D"],
    options_es: ["A", "B", "C", "D"],
    correct_index: 0,
    explanation_en: "Explanation",
    explanation_es: "Explicación",
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
      theme_id: "theme-1",
    },
  };
}

function makeCardState(
  questionId: string,
  state: UserCardState["state"],
  due: string,
  overrides: Partial<UserCardState> = {},
): UserCardState {
  return {
    id: `cs-${questionId}`,
    user_id: "user-1",
    question_id: questionId,
    stability: 5,
    difficulty: 0.3,
    elapsed_days: 1,
    scheduled_days: 5,
    reps: 1,
    lapses: 0,
    state,
    last_review: "2026-02-07T12:00:00Z",
    due,
    times_correct: 1,
    times_incorrect: 0,
    times_idk: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-02-07T12:00:00Z",
    ...overrides,
  };
}

// ─── Import after mocks ──────────────────────────────────────────────────────

const { getOrderedQuestions, getSubModeCounts } = await import("../question-ordering");

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getOrderedQuestions – bucket sorting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("sorts: review due → new → learning due → future", async () => {
    const questions = [
      makeQuestion("q-new"),         // no card state → bucket 1
      makeQuestion("q-learning"),    // learning, due → bucket 2
      makeQuestion("q-review"),      // review, due → bucket 0
      makeQuestion("q-future"),      // review, future → bucket 3
    ];

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [
        makeCardState("q-learning", "learning", "2026-02-08T11:50:00Z"),   // due (10 min ago)
        makeCardState("q-review", "review", "2026-02-07T12:00:00Z"),       // overdue (1 day)
        makeCardState("q-future", "review", "2026-02-10T12:00:00Z"),       // future
      ],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "full" });
    const ids = result.map((oq) => oq.question.id);

    expect(ids[0]).toBe("q-review");    // bucket 0
    expect(ids[1]).toBe("q-new");       // bucket 1
    expect(ids[2]).toBe("q-learning");  // bucket 2
    expect(ids[3]).toBe("q-future");    // bucket 3
  });

  it("sorts multiple review-due cards by most overdue first", async () => {
    const questions = [
      makeQuestion("q-r1"),
      makeQuestion("q-r2"),
      makeQuestion("q-r3"),
    ];

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [
        makeCardState("q-r1", "review", "2026-02-08T11:00:00Z"),  // 1 hour overdue
        makeCardState("q-r2", "review", "2026-02-06T12:00:00Z"),  // 2 days overdue (most)
        makeCardState("q-r3", "review", "2026-02-08T11:55:00Z"),  // 5 min overdue
      ],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "full" });
    const ids = result.map((oq) => oq.question.id);

    expect(ids).toEqual(["q-r2", "q-r1", "q-r3"]);
  });

  it("treats relearning-due cards as bucket 0 (genuine review)", async () => {
    const questions = [
      makeQuestion("q-new"),
      makeQuestion("q-relearn"),
    ];

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [
        makeCardState("q-relearn", "relearning", "2026-02-08T11:00:00Z"),
      ],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "full" });
    expect(result[0].question.id).toBe("q-relearn"); // bucket 0 before new
    expect(result[1].question.id).toBe("q-new");     // bucket 1
  });

  it("new cards come before learning-due cards (the core bug fix)", async () => {
    // Simulate: user answered q-a, q-b 5 minutes ago → learning state, short due.
    // q-c, q-d are unseen. User returns — unseen should come first.
    const questions = [
      makeQuestion("q-a"),
      makeQuestion("q-b"),
      makeQuestion("q-c"),
      makeQuestion("q-d"),
    ];

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [
        makeCardState("q-a", "learning", "2026-02-08T11:55:00Z"),
        makeCardState("q-b", "learning", "2026-02-08T11:56:00Z"),
      ],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "full" });
    const ids = result.map((oq) => oq.question.id);

    // New cards (q-c, q-d) are randomized but both before learning cards (q-a, q-b)
    const newIdx = ids.findIndex((id) => id === "q-c" || id === "q-d");
    const learningIdx = ids.findIndex((id) => id === "q-a" || id === "q-b");
    expect(newIdx).toBeLessThan(learningIdx);
  });

  it("excludes suspended questions", async () => {
    const questions = [makeQuestion("q-1"), makeQuestion("q-2")];

    tableData = {
      questions,
      suspended_questions: [{ question_id: "q-1" }],
      user_card_state: [],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "full" });
    expect(result).toHaveLength(1);
    expect(result[0].question.id).toBe("q-2");
  });

  it("applies limit option", async () => {
    const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(`q-${i}`));

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "full", limit: 3 });
    expect(result).toHaveLength(3);
  });

  it("returns empty array when no questions exist", async () => {
    tableData = {
      questions: [],
      suspended_questions: [],
      user_card_state: [],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "full" });
    expect(result).toEqual([]);
  });
});

describe("getOrderedQuestions – spaced_repetition filter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("includes review-due and relearning-due cards", async () => {
    const questions = [
      makeQuestion("q-review"),
      makeQuestion("q-relearn"),
    ];

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [
        makeCardState("q-review", "review", "2026-02-07T12:00:00Z"),
        makeCardState("q-relearn", "relearning", "2026-02-08T10:00:00Z"),
      ],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "spaced_repetition" });
    const ids = result.map((oq) => oq.question.id);
    expect(ids).toContain("q-review");
    expect(ids).toContain("q-relearn");
  });

  it("excludes learning-due cards from spaced_repetition", async () => {
    const questions = [
      makeQuestion("q-learning"),
      makeQuestion("q-review"),
    ];

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [
        makeCardState("q-learning", "learning", "2026-02-08T11:50:00Z"),  // due but learning
        makeCardState("q-review", "review", "2026-02-07T00:00:00Z"),       // due and review
      ],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "spaced_repetition" });
    const ids = result.map((oq) => oq.question.id);
    expect(ids).toEqual(["q-review"]);
  });

  it("excludes new/unseen cards from spaced_repetition", async () => {
    const questions = [makeQuestion("q-new")];

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "spaced_repetition" });
    expect(result).toHaveLength(0);
  });

  it("excludes future review cards from spaced_repetition", async () => {
    const questions = [makeQuestion("q-future")];

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [
        makeCardState("q-future", "review", "2026-02-10T12:00:00Z"),
      ],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "spaced_repetition" });
    expect(result).toHaveLength(0);
  });
});

describe("getOrderedQuestions – quick_review filter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("excludes unseen cards", async () => {
    const questions = [
      makeQuestion("q-seen"),
      makeQuestion("q-unseen"),
    ];

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [
        makeCardState("q-seen", "learning", "2026-02-09T12:00:00Z"),
      ],
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "quick_review" });
    expect(result).toHaveLength(1);
    expect(result[0].question.id).toBe("q-seen");
  });

  it("limits to 20 by default", async () => {
    const questions = Array.from({ length: 30 }, (_, i) => makeQuestion(`q-${i}`));

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: questions.map((q) =>
        makeCardState(q.id, "review", "2026-02-07T00:00:00Z"),
      ),
    };

    const result = await getOrderedQuestions("user-1", "theme-1", { subMode: "quick_review" });
    expect(result).toHaveLength(20);
  });
});

describe("getSubModeCounts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("returns correct counts", async () => {
    const questions = [
      { id: "q-1", categories: { theme_id: "theme-1" } },
      { id: "q-2", categories: { theme_id: "theme-1" } },
      { id: "q-3", categories: { theme_id: "theme-1" } },
      { id: "q-4", categories: { theme_id: "theme-1" } },
    ];

    tableData = {
      questions,
      suspended_questions: [],
      user_card_state: [
        { question_id: "q-1", due: "2026-02-07T00:00:00Z", state: "review" },      // due review ✓
        { question_id: "q-2", due: "2026-02-08T11:50:00Z", state: "learning" },     // due learning ✗
        { question_id: "q-3", due: "2026-02-08T11:00:00Z", state: "relearning" },   // due relearning ✓
      ],
    };

    const counts = await getSubModeCounts("user-1", "theme-1");
    expect(counts.full).toBe(4);          // all active questions
    expect(counts.quickReview).toBe(3);   // min(3 seen, 20)
    expect(counts.spacedRepetition).toBe(2); // review + relearning, NOT learning
  });

  it("excludes suspended questions from full count", async () => {
    const questions = [
      { id: "q-1", categories: { theme_id: "theme-1" } },
      { id: "q-2", categories: { theme_id: "theme-1" } },
    ];

    tableData = {
      questions,
      suspended_questions: [{ question_id: "q-1" }],
      user_card_state: [],
    };

    const counts = await getSubModeCounts("user-1", "theme-1");
    expect(counts.full).toBe(1);
  });

  it("returns zeros when no questions", async () => {
    tableData = {
      questions: [],
      suspended_questions: [],
      user_card_state: [],
    };

    const counts = await getSubModeCounts("user-1", "theme-1");
    expect(counts).toEqual({ full: 0, quickReview: 0, spacedRepetition: 0 });
  });
});
