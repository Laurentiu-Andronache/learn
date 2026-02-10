import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  createMockSupabase,
  extractJson,
  extractText,
} from "../test-helpers.js";
import {
  handleCheckTranslations,
  handleFindUntranslated,
  handleCompareTranslations,
  handleUpdateTranslation,
  handleBatchUpdateTranslations,
} from "../tools/translation.js";

function mockSupabase() {
  return createMockSupabase();
}

const SAMPLE_THEME = {
  id: "t1",
  title_en: "Science",
  title_es: "Ciencia",
  description_en: "About science",
  description_es: "Sobre ciencia",
};

const SAMPLE_CAT = {
  id: "cat1",
  name_en: "Biology",
  name_es: "Biología",
  theme_id: "t1",
};

const SAMPLE_Q_FULL = {
  id: "q1",
  question_en: "What?",
  question_es: "¿Qué?",
  options_en: ["A"],
  options_es: ["A"],
  explanation_en: "Because",
  explanation_es: "Porque",
  extra_en: "Extra",
  extra_es: "Extra",
  category_id: "cat1",
};

const SAMPLE_Q_MISSING = {
  id: "q2",
  question_en: "What?",
  question_es: null,
  options_en: ["A"],
  options_es: null,
  explanation_en: "Because",
  explanation_es: "",
  extra_en: null,
  extra_es: null,
  category_id: "cat1",
};

// ─── learn_check_translations ────────────────────────────────────────
describe("handleCheckTranslations", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns clean report when all translations present", async () => {
    let callNum = 0;
    mock.from.mockImplementation(() => {
      callNum++;
      if (callNum === 1)
        return chainable({ data: SAMPLE_THEME, error: null }); // theme
      if (callNum === 2)
        return chainable({ data: [SAMPLE_CAT], error: null }); // categories
      return chainable({ data: [SAMPLE_Q_FULL], error: null }); // questions
    });
    const result = await handleCheckTranslations(mock as any, {
      topic_id: "t1",
    });
    const json = extractJson(result) as any;
    expect(json.missing_count).toBe(0);
  });

  it("detects missing translations in questions", async () => {
    let callNum = 0;
    mock.from.mockImplementation(() => {
      callNum++;
      if (callNum === 1)
        return chainable({ data: SAMPLE_THEME, error: null });
      if (callNum === 2)
        return chainable({ data: [SAMPLE_CAT], error: null });
      return chainable({ data: [SAMPLE_Q_MISSING], error: null });
    });
    const result = await handleCheckTranslations(mock as any, {
      topic_id: "t1",
    });
    const json = extractJson(result) as any;
    expect(json.missing_count).toBeGreaterThan(0);
    expect(json.missing.length).toBeGreaterThan(0);
  });

  it("detects missing theme translations", async () => {
    const theme = { ...SAMPLE_THEME, title_es: null };
    let callNum = 0;
    mock.from.mockImplementation(() => {
      callNum++;
      if (callNum === 1) return chainable({ data: theme, error: null });
      if (callNum === 2)
        return chainable({ data: [SAMPLE_CAT], error: null });
      return chainable({ data: [], error: null });
    });
    const result = await handleCheckTranslations(mock as any, {
      topic_id: "t1",
    });
    const json = extractJson(result) as any;
    expect(json.missing_count).toBeGreaterThan(0);
  });

  it("returns error when theme not found", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "not found" } })
    );
    const result = await handleCheckTranslations(mock as any, {
      topic_id: "bad",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_find_untranslated ─────────────────────────────────────────
describe("handleFindUntranslated", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("finds untranslated content across tables", async () => {
    let callNum = 0;
    mock.from.mockImplementation(() => {
      callNum++;
      if (callNum === 1)
        return chainable({
          data: [{ ...SAMPLE_THEME, title_es: null }],
          error: null,
        }); // themes
      if (callNum === 2)
        return chainable({
          data: [{ ...SAMPLE_CAT, name_es: null }],
          error: null,
        }); // categories
      return chainable({ data: [SAMPLE_Q_MISSING], error: null }); // questions
    });
    const result = await handleFindUntranslated(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.themes.length).toBeGreaterThan(0);
    expect(json.categories.length).toBeGreaterThan(0);
    expect(json.questions.length).toBeGreaterThan(0);
  });

  it("returns empty when all translated", async () => {
    mock.from.mockReturnValue(chainable({ data: [], error: null }));
    const result = await handleFindUntranslated(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.themes).toEqual([]);
    expect(json.categories).toEqual([]);
    expect(json.questions).toEqual([]);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "DB error" } })
    );
    const result = await handleFindUntranslated(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_compare_translations ──────────────────────────────────────
describe("handleCompareTranslations", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns side-by-side comparisons by topic_id", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [SAMPLE_Q_FULL], error: null })
    );
    const result = await handleCompareTranslations(mock as any, {
      topic_id: "t1",
    });
    const json = extractJson(result) as any;
    expect(json.questions).toHaveLength(1);
    expect(json.questions[0].fields.question.en).toBe("What?");
    expect(json.questions[0].fields.question.es).toBe("¿Qué?");
  });

  it("returns comparisons by question_ids", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [SAMPLE_Q_FULL], error: null })
    );
    const result = await handleCompareTranslations(mock as any, {
      question_ids: ["q1"],
    });
    const json = extractJson(result) as any;
    expect(json.questions).toHaveLength(1);
  });

  it("returns error when neither topic_id nor question_ids provided", async () => {
    const result = await handleCompareTranslations(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleCompareTranslations(mock as any, {
      topic_id: "t1",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_update_translation ────────────────────────────────────────
describe("handleUpdateTranslation", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("updates translation fields", async () => {
    const updated = { ...SAMPLE_Q_FULL, question_es: "¿Actualizado?" };
    mock.from.mockReturnValue(chainable({ data: updated, error: null }));
    const result = await handleUpdateTranslation(mock as any, {
      question_id: "q1",
      fields: { question_es: "¿Actualizado?" },
    });
    const json = extractJson(result) as any;
    expect(json.question_es).toBe("¿Actualizado?");
  });

  it("rejects non-translation fields", async () => {
    const result = await handleUpdateTranslation(mock as any, {
      question_id: "q1",
      fields: { difficulty: 5 },
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("rejects empty fields", async () => {
    const result = await handleUpdateTranslation(mock as any, {
      question_id: "q1",
      fields: {},
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "update fail" } })
    );
    const result = await handleUpdateTranslation(mock as any, {
      question_id: "q1",
      fields: { question_es: "test" },
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_batch_update_translations ─────────────────────────────────
describe("handleBatchUpdateTranslations", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("updates translations for multiple questions", async () => {
    mock.from.mockReturnValue(
      chainable({ data: SAMPLE_Q_FULL, error: null })
    );
    const result = await handleBatchUpdateTranslations(mock as any, {
      updates: [
        { question_id: "q1", fields: { question_es: "Uno" } },
        { question_id: "q2", fields: { question_es: "Dos" } },
      ],
    });
    const json = extractJson(result) as any;
    expect(json.updated).toBe(2);
  });

  it("reports partial failures", async () => {
    let callCount = 0;
    mock.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return chainable({ data: SAMPLE_Q_FULL, error: null });
      return chainable({ data: null, error: { message: "fail" } });
    });
    const result = await handleBatchUpdateTranslations(mock as any, {
      updates: [
        { question_id: "q1", fields: { question_es: "Uno" } },
        { question_id: "q2", fields: { question_es: "Dos" } },
      ],
    });
    const json = extractJson(result) as any;
    expect(json.updated).toBe(1);
    expect(json.errors).toHaveLength(1);
  });

  it("rejects empty updates array", async () => {
    const result = await handleBatchUpdateTranslations(mock as any, {
      updates: [],
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("rejects non-translation fields in batch", async () => {
    const result = await handleBatchUpdateTranslations(mock as any, {
      updates: [{ question_id: "q1", fields: { difficulty: 5 } }],
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});
