import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  createMockSupabase,
  extractJson,
  extractText,
} from "../test-helpers.js";
import {
  handleListQuestions,
  handleGetQuestion,
  handleSearchQuestions,
  handleCreateQuestion,
  handleCreateQuestionsBatch,
  handleUpdateQuestion,
  handleUpdateQuestionsBatch,
  handleDeleteQuestion,
  handleDeleteQuestionsBatch,
  handleMoveQuestions,
} from "../tools/questions.js";

function mockSupabase() {
  return createMockSupabase();
}

const SAMPLE_Q = {
  id: "q1",
  category_id: "cat1",
  type: "multiple_choice",
  question_en: "What is mitochondria?",
  question_es: "¿Qué es la mitocondria?",
  options_en: ["A", "B", "C", "D"],
  options_es: ["A", "B", "C", "D"],
  correct_index: 0,
  explanation_en: "Powerhouse of cell",
  explanation_es: "Central energética",
  extra_en: null,
  extra_es: null,
  difficulty: 5,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// ─── learn_list_questions ────────────────────────────────────────────
describe("handleListQuestions", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns questions with default limit/offset", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [SAMPLE_Q], error: null, count: 1 })
    );
    const result = await handleListQuestions(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.questions).toEqual([SAMPLE_Q]);
    expect(json.total).toBe(1);
    expect(mock.from).toHaveBeenCalledWith("questions");
  });

  it("applies topic_id filter via inner join", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null, count: 0 })
    );
    await handleListQuestions(mock as any, { topic_id: "t1" });
    expect(mock.from).toHaveBeenCalledWith("questions");
  });

  it("applies type filter", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null, count: 0 })
    );
    await handleListQuestions(mock as any, { type: "true_false" });
    expect(mock.from).toHaveBeenCalledWith("questions");
  });

  it("applies difficulty range", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null, count: 0 })
    );
    await handleListQuestions(mock as any, {
      difficulty_min: 3,
      difficulty_max: 7,
    });
    expect(mock.from).toHaveBeenCalledWith("questions");
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "DB down" } })
    );
    const result = await handleListQuestions(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("returns empty array when no matches", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null, count: 0 })
    );
    const result = await handleListQuestions(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.questions).toEqual([]);
    expect(json.total).toBe(0);
  });
});

// ─── learn_get_question ──────────────────────────────────────────────
describe("handleGetQuestion", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns question with category/topic context", async () => {
    const q = {
      ...SAMPLE_Q,
      categories: { id: "cat1", name_en: "Bio", name_es: "Bio", themes: { id: "t1", title_en: "Science" } },
    };
    mock.from.mockReturnValue(chainable({ data: q, error: null }));
    const result = await handleGetQuestion(mock as any, { question_id: "q1" });
    const json = extractJson(result) as any;
    expect(json.id).toBe("q1");
  });

  it("returns error when not found", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "Not found" } })
    );
    const result = await handleGetQuestion(mock as any, {
      question_id: "missing",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("returns error on null data", async () => {
    mock.from.mockReturnValue(chainable({ data: null, error: null }));
    const result = await handleGetQuestion(mock as any, { question_id: "q1" });
    expect(extractText(result)).toContain("not found");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_search_questions ──────────────────────────────────────────
describe("handleSearchQuestions", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("searches across text fields", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [SAMPLE_Q], error: null })
    );
    const result = await handleSearchQuestions(mock as any, {
      query: "mitochondria",
    });
    const json = extractJson(result) as any;
    expect(json).toHaveLength(1);
  });

  it("limits results", async () => {
    mock.from.mockReturnValue(chainable({ data: [], error: null }));
    await handleSearchQuestions(mock as any, {
      query: "test",
      limit: 5,
    });
    expect(mock.from).toHaveBeenCalledWith("questions");
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "timeout" } })
    );
    const result = await handleSearchQuestions(mock as any, {
      query: "test",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("returns empty array for no matches", async () => {
    mock.from.mockReturnValue(chainable({ data: [], error: null }));
    const result = await handleSearchQuestions(mock as any, {
      query: "nonexistent",
    });
    expect(extractJson(result)).toEqual([]);
  });
});

// ─── learn_create_question ───────────────────────────────────────────
describe("handleCreateQuestion", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("creates a question with required fields", async () => {
    mock.from.mockReturnValue(
      chainable({ data: SAMPLE_Q, error: null })
    );
    const result = await handleCreateQuestion(mock as any, {
      category_id: "cat1",
      type: "multiple_choice",
      question_en: "What?",
      question_es: "¿Qué?",
    });
    const json = extractJson(result) as any;
    expect(json.id).toBe("q1");
  });

  it("creates with all optional fields", async () => {
    mock.from.mockReturnValue(
      chainable({ data: SAMPLE_Q, error: null })
    );
    const result = await handleCreateQuestion(mock as any, {
      category_id: "cat1",
      type: "multiple_choice",
      question_en: "What?",
      question_es: "¿Qué?",
      options_en: ["A", "B"],
      options_es: ["A", "B"],
      correct_index: 0,
      explanation_en: "Because",
      explanation_es: "Porque",
      extra_en: "Extra",
      extra_es: "Extra",
      difficulty: 7,
    });
    expect(extractJson(result)).toBeTruthy();
  });

  it("returns error on insert failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "FK violation" } })
    );
    const result = await handleCreateQuestion(mock as any, {
      category_id: "bad",
      type: "multiple_choice",
      question_en: "Q",
      question_es: "P",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_create_questions_batch ────────────────────────────────────
describe("handleCreateQuestionsBatch", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("inserts multiple questions", async () => {
    const data = [SAMPLE_Q, { ...SAMPLE_Q, id: "q2" }];
    mock.from.mockReturnValue(chainable({ data, error: null }));
    const result = await handleCreateQuestionsBatch(mock as any, {
      category_id: "cat1",
      questions: [
        { type: "multiple_choice", question_en: "Q1", question_es: "P1" },
        { type: "true_false", question_en: "Q2", question_es: "P2" },
      ],
    });
    const json = extractJson(result) as any;
    expect(json).toHaveLength(2);
  });

  it("returns error on batch insert failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "batch error" } })
    );
    const result = await handleCreateQuestionsBatch(mock as any, {
      category_id: "cat1",
      questions: [{ type: "multiple_choice", question_en: "Q", question_es: "P" }],
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("rejects empty questions array", async () => {
    const result = await handleCreateQuestionsBatch(mock as any, {
      category_id: "cat1",
      questions: [],
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_update_question ───────────────────────────────────────────
describe("handleUpdateQuestion", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("updates a question", async () => {
    const updated = { ...SAMPLE_Q, difficulty: 8 };
    mock.from.mockReturnValue(chainable({ data: updated, error: null }));
    const result = await handleUpdateQuestion(mock as any, {
      question_id: "q1",
      difficulty: 8,
    });
    const json = extractJson(result) as any;
    expect(json.difficulty).toBe(8);
  });

  it("returns error when question not found", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "not found" } })
    );
    const result = await handleUpdateQuestion(mock as any, {
      question_id: "missing",
      difficulty: 1,
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("rejects update with no fields", async () => {
    const result = await handleUpdateQuestion(mock as any, {
      question_id: "q1",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_update_questions_batch ────────────────────────────────────
describe("handleUpdateQuestionsBatch", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("updates multiple questions", async () => {
    mock.from.mockReturnValue(
      chainable({ data: SAMPLE_Q, error: null })
    );
    const result = await handleUpdateQuestionsBatch(mock as any, {
      updates: [
        { question_id: "q1", difficulty: 3 },
        { question_id: "q2", question_en: "Updated" },
      ],
    });
    const json = extractJson(result) as any;
    expect(json.updated).toBe(2);
  });

  it("reports partial failures", async () => {
    let callCount = 0;
    mock.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainable({ data: SAMPLE_Q, error: null });
      }
      return chainable({ data: null, error: { message: "fail" } });
    });
    const result = await handleUpdateQuestionsBatch(mock as any, {
      updates: [
        { question_id: "q1", difficulty: 3 },
        { question_id: "q2", difficulty: 4 },
      ],
    });
    const json = extractJson(result) as any;
    expect(json.errors).toHaveLength(1);
  });

  it("rejects empty updates array", async () => {
    const result = await handleUpdateQuestionsBatch(mock as any, {
      updates: [],
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_delete_question ───────────────────────────────────────────
describe("handleDeleteQuestion", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("deletes a question", async () => {
    mock.from.mockReturnValue(chainable({ data: null, error: null }));
    const result = await handleDeleteQuestion(mock as any, {
      question_id: "q1",
    });
    expect(extractText(result)).toContain("Deleted");
  });

  it("returns error on delete failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "FK constraint" } })
    );
    const result = await handleDeleteQuestion(mock as any, {
      question_id: "q1",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_delete_questions_batch ────────────────────────────────────
describe("handleDeleteQuestionsBatch", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("deletes multiple questions with confirm", async () => {
    mock.from.mockReturnValue(chainable({ data: null, error: null }));
    const result = await handleDeleteQuestionsBatch(mock as any, {
      question_ids: ["q1", "q2"],
      confirm: "DELETE ALL",
    });
    expect(extractText(result)).toContain("Deleted");
  });

  it("rejects without confirm string", async () => {
    const result = await handleDeleteQuestionsBatch(mock as any, {
      question_ids: ["q1"],
      confirm: "wrong",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "cascade fail" } })
    );
    const result = await handleDeleteQuestionsBatch(mock as any, {
      question_ids: ["q1"],
      confirm: "DELETE ALL",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("rejects empty question_ids", async () => {
    const result = await handleDeleteQuestionsBatch(mock as any, {
      question_ids: [],
      confirm: "DELETE ALL",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_move_questions ────────────────────────────────────────────
describe("handleMoveQuestions", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("moves questions to new category", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [SAMPLE_Q], error: null })
    );
    const result = await handleMoveQuestions(mock as any, {
      question_ids: ["q1", "q2"],
      new_category_id: "cat2",
    });
    expect(extractText(result)).toContain("Moved");
  });

  it("returns error on move failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "invalid category" } })
    );
    const result = await handleMoveQuestions(mock as any, {
      question_ids: ["q1"],
      new_category_id: "bad",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("rejects empty question_ids", async () => {
    const result = await handleMoveQuestions(mock as any, {
      question_ids: [],
      new_category_id: "cat2",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});
