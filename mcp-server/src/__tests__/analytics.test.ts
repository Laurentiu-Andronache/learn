import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  createMockSupabase,
  extractJson,
  extractText,
} from "../test-helpers.js";
import {
  handleTopicStats,
  handleContentOverview,
  handleQuestionQualityReport,
  handleUserActivityStats,
  handleDifficultyAnalysis,
} from "../tools/analytics.js";

function mockSupabase() {
  return createMockSupabase();
}

// ─── learn_topic_stats ─────────────────────────────────────────────
describe("handleTopicStats", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns stats for a topic", async () => {
    let callNum = 0;
    mock.from.mockImplementation((table: string) => {
      callNum++;
      if (table === "categories") {
        return chainable({ data: [{ id: "c1" }, { id: "c2" }], error: null });
      }
      if (table === "questions") {
        if (callNum <= 3) {
          // question count
          return chainable({
            data: [
              { id: "q1", difficulty: 3, type: "multiple_choice", question_es: "hola", options_es: ["a"], explanation_es: "e" },
              { id: "q2", difficulty: 7, type: "true_false", question_es: null, options_es: null, explanation_es: null },
            ],
            error: null,
          });
        }
      }
      return chainable({ data: [], error: null });
    });
    const result = await handleTopicStats(mock as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.topic_id).toBe("t1");
    expect(json.category_count).toBe(2);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "DB error" } })
    );
    const result = await handleTopicStats(mock as any, { topic_id: "t1" });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("handles topic with no categories", async () => {
    mock.from.mockImplementation((table: string) => {
      if (table === "categories") {
        return chainable({ data: [], error: null });
      }
      return chainable({ data: [], error: null });
    });
    const result = await handleTopicStats(mock as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.category_count).toBe(0);
    expect(json.question_count).toBe(0);
  });
});

// ─── learn_content_overview ────────────────────────────────────────
describe("handleContentOverview", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns overview of all active topics", async () => {
    mock.from.mockImplementation((table: string) => {
      if (table === "topics") {
        return chainable({
          data: [
            { id: "t1", title_en: "Science", is_active: true, categories: [{ id: "c1", questions: [{ id: "q1", question_es: "hola", options_es: ["a"], explanation_es: "e" }] }] },
          ],
          error: null,
        });
      }
      return chainable({ data: [], error: null });
    });
    const result = await handleContentOverview(mock as any);
    const json = extractJson(result) as any;
    expect(json.topics).toBeDefined();
    expect(json.totals).toBeDefined();
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "timeout" } })
    );
    const result = await handleContentOverview(mock as any);
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("handles no active topics", async () => {
    mock.from.mockReturnValue(chainable({ data: [], error: null }));
    const result = await handleContentOverview(mock as any);
    const json = extractJson(result) as any;
    expect(json.topics).toEqual([]);
    expect(json.totals.topics).toBe(0);
  });
});

// ─── learn_question_quality_report ─────────────────────────────────
describe("handleQuestionQualityReport", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("finds questions with quality issues", async () => {
    let callNum = 0;
    mock.from.mockImplementation((table: string) => {
      callNum++;
      if (table === "questions") {
        return chainable({
          data: [
            {
              id: "q1",
              type: "multiple_choice",
              question_en: "What?",
              question_es: "¿Qué?",
              options_en: ["A", "B", "C", "D"],
              options_es: null,
              explanation_en: null,
              explanation_es: null,
              correct_index: 0,
              category_id: "c1",
            },
            {
              id: "q2",
              type: "multiple_choice",
              question_en: "Who?",
              question_es: "¿Quién?",
              options_en: ["A", "B"],
              options_es: ["A", "B", "C"],
              explanation_en: "Good",
              explanation_es: "Bueno",
              correct_index: 0,
              category_id: "c1",
            },
          ],
          error: null,
        });
      }
      if (table === "flashcards") {
        return chainable({ data: [], error: null });
      }
      return chainable({ data: [], error: null });
    });
    const result = await handleQuestionQualityReport(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.question_issues.length).toBeGreaterThan(0);
  });

  it("returns no issues for clean data", async () => {
    let callNum = 0;
    mock.from.mockImplementation((table: string) => {
      if (table === "questions") {
        return chainable({
          data: [
            {
              id: "q1",
              type: "multiple_choice",
              question_en: "What?",
              question_es: "¿Qué?",
              options_en: ["A", "B", "C", "D"],
              options_es: ["A", "B", "C", "D"],
              explanation_en: "Good",
              explanation_es: "Bueno",
              correct_index: 0,
              category_id: "c1",
            },
          ],
          error: null,
        });
      }
      if (table === "flashcards") {
        return chainable({ data: [], error: null });
      }
      return chainable({ data: [], error: null });
    });
    const result = await handleQuestionQualityReport(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.question_issues).toEqual([]);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleQuestionQualityReport(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("filters by topic_id", async () => {
    mock.from.mockImplementation((table: string) => {
      if (table === "categories") {
        return chainable({ data: [{ id: "c1" }], error: null });
      }
      return chainable({ data: [], error: null });
    });
    const result = await handleQuestionQualityReport(mock as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.question_issues).toEqual([]);
    expect(mock.from).toHaveBeenCalledWith("questions");
  });
});

// ─── learn_user_activity_stats ─────────────────────────────────────
describe("handleUserActivityStats", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns activity stats", async () => {
    mock.from.mockReturnValue(
      chainable({
        data: [
          { user_id: "u1", was_correct: true, flashcard_id: "fc1", reviewed_at: "2026-01-01" },
          { user_id: "u1", was_correct: false, flashcard_id: "fc1", reviewed_at: "2026-01-01" },
          { user_id: "u2", was_correct: true, flashcard_id: "fc2", reviewed_at: "2026-01-02" },
        ],
        error: null,
      })
    );
    const result = await handleUserActivityStats(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.total_reviews).toBe(3);
    expect(json.unique_users).toBe(2);
  });

  it("filters by topic_id", async () => {
    mock.from.mockImplementation((table: string) => {
      if (table === "categories") {
        return chainable({ data: [{ id: "c1" }], error: null });
      }
      if (table === "flashcards") {
        return chainable({ data: [{ id: "fc1" }], error: null });
      }
      // review_logs
      return chainable({ data: [], error: null });
    });
    const result = await handleUserActivityStats(mock as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.total_reviews).toBe(0);
  });

  it("filters by since date", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    const result = await handleUserActivityStats(mock as any, { since: "2026-01-01" });
    const json = extractJson(result) as any;
    expect(json.total_reviews).toBe(0);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "error" } })
    );
    const result = await handleUserActivityStats(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("identifies hardest flashcards", async () => {
    mock.from.mockReturnValue(
      chainable({
        data: [
          { user_id: "u1", was_correct: false, flashcard_id: "fc1", reviewed_at: "2026-01-01" },
          { user_id: "u2", was_correct: false, flashcard_id: "fc1", reviewed_at: "2026-01-02" },
          { user_id: "u1", was_correct: true, flashcard_id: "fc2", reviewed_at: "2026-01-01" },
        ],
        error: null,
      })
    );
    const result = await handleUserActivityStats(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.hardest_flashcards[0].flashcard_id).toBe("fc1");
    expect(json.hardest_flashcards[0].incorrect_count).toBe(2);
  });
});

// ─── learn_difficulty_analysis ─────────────────────────────────────
describe("handleDifficultyAnalysis", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("compares assigned vs actual difficulty", async () => {
    let callNum = 0;
    mock.from.mockImplementation((table: string) => {
      callNum++;
      if (table === "flashcards") {
        return chainable({
          data: [
            { id: "fc1", difficulty: 5, question_en: "What?", categories: { topic_id: "t1" } },
          ],
          error: null,
        });
      }
      if (table === "review_logs") {
        return chainable({
          data: [
            { flashcard_id: "fc1", was_correct: true },
            { flashcard_id: "fc1", was_correct: false },
            { flashcard_id: "fc1", was_correct: true },
          ],
          error: null,
        });
      }
      return chainable({ data: [], error: null });
    });
    const result = await handleDifficultyAnalysis(mock as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.flashcards).toBeDefined();
    expect(json.flashcards[0].assigned_difficulty).toBe(5);
    expect(json.flashcards[0].actual_correct_pct).toBeCloseTo(66.67, 0);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleDifficultyAnalysis(mock as any, { topic_id: "t1" });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("handles flashcards with no reviews", async () => {
    mock.from.mockImplementation((table: string) => {
      if (table === "flashcards") {
        return chainable({
          data: [
            { id: "fc1", difficulty: 5, question_en: "What?", categories: { topic_id: "t1" } },
          ],
          error: null,
        });
      }
      if (table === "review_logs") {
        return chainable({ data: [], error: null });
      }
      return chainable({ data: [], error: null });
    });
    const result = await handleDifficultyAnalysis(mock as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.flashcards[0].total_reviews).toBe(0);
    expect(json.flashcards[0].actual_correct_pct).toBe(null);
  });
});
