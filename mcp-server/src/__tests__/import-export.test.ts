import { describe, it, expect, vi } from "vitest";
import { chainable, createMockSupabase, extractJson, extractText } from "../test-helpers.js";

vi.mock("../supabase.js", () => ({ getSupabaseClient: vi.fn() }));

import {
  handleExportTopic,
  handleImportTopic,
  handleValidateImport,
  handleDuplicateTopic,
} from "../tools/import-export.js";

function mockSupabase() {
  return createMockSupabase();
}

const sampleImport = {
  title_en: "Physics", title_es: "Física",
  description_en: "Intro to physics", description_es: null,
  icon: "🔬", color: "#0000ff",
  categories: [
    {
      name_en: "Mechanics", name_es: "Mecánica", slug: "mechanics", color: null,
      questions: [
        {
          type: "multiple_choice", question_en: "What is force?", question_es: "¿Qué es fuerza?",
          options_en: ["A", "B", "C", "D"], options_es: ["A", "B", "C", "D"],
          correct_index: 0, explanation_en: "F=ma", explanation_es: "F=ma",
        },
      ],
    },
  ],
};

/* ────────────────────── learn_export_topic ────────────────────── */

describe("handleExportTopic", () => {
  it("exports topic as ImportTopic JSON", async () => {
    const sb = mockSupabase();
    const topic = {
      id: "t1", title_en: "Bio", title_es: "Bio",
      description_en: "d", description_es: null, icon: "🧬", color: "#00ff00",
      intro_text_en: null, intro_text_es: null,
    };
    const cats = [{ id: "c1", topic_id: "t1", name_en: "Cells", name_es: "Células", slug: "cells", color: null }];
    const questions = [{
      id: "q1", category_id: "c1", type: "multiple_choice",
      question_en: "What?", question_es: "¿Qué?",
      options_en: ["A", "B"], options_es: ["A", "B"],
      correct_index: 0, explanation_en: "Because", explanation_es: "Porque",
      extra_en: null, extra_es: null, difficulty: 5,
    }];

    sb.from.mockReturnValueOnce(chainable({ data: topic, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: cats, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: questions, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null })); // flashcards

    const result = await handleExportTopic(sb as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.title_en).toBe("Bio");
    expect(json.categories).toHaveLength(1);
    expect(json.categories[0].questions).toHaveLength(1);
    expect(json.categories[0].flashcards).toHaveLength(0);
    // By default, no IDs included
    expect(json.categories[0].questions[0].id).toBeUndefined();
  });

  it("includes IDs when requested", async () => {
    const sb = mockSupabase();
    const topic = { id: "t1", title_en: "Bio", title_es: "Bio" };
    const cats = [{ id: "c1", topic_id: "t1", name_en: "X", name_es: "Y", slug: "x", color: null }];
    const questions = [{
      id: "q1", category_id: "c1", type: "true_false",
      question_en: "True?", question_es: "¿Verdad?",
      options_en: null, options_es: null,
      correct_index: 0, explanation_en: null, explanation_es: null,
      extra_en: null, extra_es: null, difficulty: 3,
    }];

    sb.from.mockReturnValueOnce(chainable({ data: topic, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: cats, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: questions, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null })); // flashcards

    const result = await handleExportTopic(sb as any, { topic_id: "t1", include_ids: true });
    const json = extractJson(result) as any;
    expect(json.categories[0].questions[0].id).toBe("q1");
  });

  it("returns error if topic not found", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "not found" } }));

    const result = await handleExportTopic(sb as any, { topic_id: "bad" });
    expect((result as any).isError).toBe(true);
  });

  it("handles topic with no categories", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: { id: "t1", title_en: "E", title_es: "E" }, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null })); // questions
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null })); // flashcards

    const result = await handleExportTopic(sb as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.categories).toEqual([]);
  });
});

/* ────────────────────── learn_import_topic ────────────────────── */

describe("handleImportTopic", () => {
  it("imports a full topic with categories and questions", async () => {
    const sb = mockSupabase();
    // insert topic
    sb.from.mockReturnValueOnce(chainable({ data: { id: "t-new" }, error: null }));
    // insert category
    sb.from.mockReturnValueOnce(chainable({ data: { id: "c-new" }, error: null }));
    // insert questions
    sb.from.mockReturnValueOnce(chainable({ data: [{ id: "q-new" }], error: null }));

    const result = await handleImportTopic(sb as any, { data: sampleImport });
    const json = extractJson(result) as any;
    expect(json.topic_id).toBe("t-new");
    expect(json.categories_created).toBe(1);
    expect(json.questions_created).toBe(1);
  });

  it("returns error on topic insert failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "insert failed" } }));

    const result = await handleImportTopic(sb as any, { data: sampleImport });
    expect((result as any).isError).toBe(true);
  });

  it("handles import with empty categories", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: { id: "t-new" }, error: null }));

    const data = { ...sampleImport, categories: [] };
    const result = await handleImportTopic(sb as any, { data });
    const json = extractJson(result) as any;
    expect(json.topic_id).toBe("t-new");
    expect(json.categories_created).toBe(0);
    expect(json.questions_created).toBe(0);
  });

  it("returns error on category insert failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: { id: "t-new" }, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "category insert failed" } }));

    const result = await handleImportTopic(sb as any, { data: sampleImport });
    expect((result as any).isError).toBe(true);
  });
});

/* ────────────────────── learn_validate_import ────────────────────── */

describe("handleValidateImport", () => {
  it("validates correct import data", async () => {
    const result = await handleValidateImport({ data: sampleImport });
    const json = extractJson(result) as any;
    expect(json.valid).toBe(true);
    expect(json.errors).toHaveLength(0);
    expect(json.summary.categories).toBe(1);
    expect(json.summary.questions).toBe(1);
  });

  it("catches missing title_en", async () => {
    const data = { ...sampleImport, title_en: "" };
    const result = await handleValidateImport({ data });
    const json = extractJson(result) as any;
    expect(json.valid).toBe(false);
    expect(json.errors.length).toBeGreaterThan(0);
  });

  it("catches missing title_es", async () => {
    const data = { ...sampleImport, title_es: "" };
    const result = await handleValidateImport({ data });
    const json = extractJson(result) as any;
    expect(json.valid).toBe(false);
  });

  it("catches invalid question type", async () => {
    const data = {
      ...sampleImport,
      categories: [{
        ...sampleImport.categories[0],
        questions: [{ ...sampleImport.categories[0].questions[0], type: "essay" }],
      }],
    };
    const result = await handleValidateImport({ data });
    const json = extractJson(result) as any;
    expect(json.valid).toBe(false);
    expect(json.errors.some((e: string) => e.includes("type"))).toBe(true);
  });

  it("catches multiple_choice without options", async () => {
    const data = {
      ...sampleImport,
      categories: [{
        ...sampleImport.categories[0],
        questions: [{ ...sampleImport.categories[0].questions[0], options_en: null }],
      }],
    };
    const result = await handleValidateImport({ data });
    const json = extractJson(result) as any;
    expect(json.valid).toBe(false);
  });

  it("validates empty categories array", async () => {
    const data = { ...sampleImport, categories: [] };
    const result = await handleValidateImport({ data });
    const json = extractJson(result) as any;
    expect(json.valid).toBe(true);
    expect(json.summary.categories).toBe(0);
  });

  it("catches category missing slug", async () => {
    const data = {
      ...sampleImport,
      categories: [{ ...sampleImport.categories[0], slug: "" }],
    };
    const result = await handleValidateImport({ data });
    const json = extractJson(result) as any;
    expect(json.valid).toBe(false);
  });
});

/* ────────────────────── learn_duplicate_topic ────────────────────── */

describe("handleDuplicateTopic", () => {
  it("duplicates a topic with new titles", async () => {
    const sb = mockSupabase();
    const topic = {
      id: "t1", title_en: "Bio", title_es: "Bio",
      description_en: "d", description_es: null, icon: "🧬", color: "#00ff00",
      intro_text_en: null, intro_text_es: null,
    };
    const cats = [{ id: "c1", topic_id: "t1", name_en: "Cells", name_es: "Células", slug: "cells", color: null }];
    const questions = [{
      id: "q1", category_id: "c1", type: "multiple_choice",
      question_en: "What?", question_es: "¿Qué?",
      options_en: ["A"], options_es: ["A"],
      correct_index: 0, explanation_en: null, explanation_es: null,
      extra_en: null, extra_es: null, difficulty: 5,
    }];

    // Fetch source (export)
    sb.from.mockReturnValueOnce(chainable({ data: topic, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: cats, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: questions, error: null })); // questions
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null })); // flashcards
    // Insert new topic
    sb.from.mockReturnValueOnce(chainable({ data: { id: "t-dup" }, error: null }));
    // Insert category
    sb.from.mockReturnValueOnce(chainable({ data: { id: "c-dup" }, error: null }));
    // Insert questions
    sb.from.mockReturnValueOnce(chainable({ data: [{ id: "q-dup" }], error: null }));

    const result = await handleDuplicateTopic(sb as any, {
      topic_id: "t1", new_title_en: "Bio Copy", new_title_es: "Bio Copia",
    });
    const json = extractJson(result) as any;
    expect(json.new_topic_id).toBe("t-dup");
    expect(json.categories_created).toBe(1);
    expect(json.questions_created).toBe(1);
  });

  it("uses default title suffix when no new titles", async () => {
    const sb = mockSupabase();
    const topic = {
      id: "t1", title_en: "Bio", title_es: "Bio",
      description_en: null, description_es: null, icon: null, color: null,
      intro_text_en: null, intro_text_es: null,
    };

    sb.from.mockReturnValueOnce(chainable({ data: topic, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null })); // categories
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null })); // questions
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null })); // flashcards
    sb.from.mockReturnValueOnce(chainable({ data: { id: "t-dup" }, error: null }));

    const result = await handleDuplicateTopic(sb as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.new_topic_id).toBe("t-dup");
  });

  it("returns error if source topic not found", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "not found" } }));

    const result = await handleDuplicateTopic(sb as any, { topic_id: "bad" });
    expect((result as any).isError).toBe(true);
  });
});
