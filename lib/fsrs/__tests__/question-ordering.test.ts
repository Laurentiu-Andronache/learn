import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Supabase mock ───────────────────────────────────────────────────────────

type MockResult = { data: unknown; error: null; count?: number };

function chainable(result: MockResult) {
  const self = {
    select: () => self,
    eq: () => self,
    in: () => self,
    returns: () => self,
    single: () => Promise.resolve(result),
    // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for await support
    then: (resolve: (v: MockResult) => void) =>
      Promise.resolve(result).then(resolve),
  };
  return self;
}

let tableData: Record<string, unknown[]>;

function createMockClient() {
  return {
    from: (table: string) => {
      const rows = tableData[table] ?? [];
      return chainable({ data: rows, error: null, count: rows.length });
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(createMockClient()),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    explanation_es: "Explicacion",
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

// ─── Import after mocks ──────────────────────────────────────────────────────

const { getOrderedQuestions, getQuizQuestionCount } = await import(
  "../question-ordering"
);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getOrderedQuestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all questions for a topic", async () => {
    tableData = {
      questions: [
        makeQuestion("q-1"),
        makeQuestion("q-2"),
        makeQuestion("q-3"),
      ],
    };

    const result = await getOrderedQuestions("user-1", "topic-1");
    expect(result).toHaveLength(3);
  });

  it("returns empty array when no questions exist", async () => {
    tableData = { questions: [] };

    const result = await getOrderedQuestions("user-1", "topic-1");
    expect(result).toEqual([]);
  });

  it("maps category data correctly", async () => {
    tableData = { questions: [makeQuestion("q-1", "cat-special")] };

    const result = await getOrderedQuestions("user-1", "topic-1");
    expect(result).toHaveLength(1);
    expect(result[0].categoryNameEn).toBe("Cat");
    expect(result[0].categoryNameEs).toBe("Gato");
    expect(result[0].categoryColor).toBe("#fff");
    expect(result[0].question.id).toBe("q-1");
  });

  it("returns shuffled results (all questions present)", async () => {
    const questions = Array.from({ length: 20 }, (_, i) =>
      makeQuestion(`q-${i}`),
    );
    tableData = { questions };

    const result = await getOrderedQuestions("user-1", "topic-1");
    expect(result).toHaveLength(20);
    // All IDs should be present
    const ids = new Set(result.map((oq) => oq.question.id));
    for (let i = 0; i < 20; i++) {
      expect(ids.has(`q-${i}`)).toBe(true);
    }
  });
});

describe("getQuizQuestionCount", () => {
  it("returns the count of questions for a topic", async () => {
    tableData = {
      questions: [makeQuestion("q-1"), makeQuestion("q-2")],
    };

    const count = await getQuizQuestionCount("topic-1");
    expect(count).toBe(2);
  });

  it("returns 0 when no questions", async () => {
    tableData = { questions: [] };

    const count = await getQuizQuestionCount("topic-1");
    expect(count).toBe(0);
  });
});
