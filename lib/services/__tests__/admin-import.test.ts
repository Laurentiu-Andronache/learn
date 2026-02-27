import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({ data: { user: { id: "admin-uuid" } } }),
    ),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import type { ImportTopic } from "../admin-import";
import { importTopicJson, validateImportJson } from "../admin-import";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "admin-uuid" } },
  });
});

// ─── validateImportJson ─────────────────────────────────────────────

describe("validateImportJson", () => {
  it("validates a complete valid import", async () => {
    const data = {
      title_en: "Vaccines",
      title_es: "Vacunas",
      categories: [
        {
          name_en: "Basics",
          name_es: "Basicos",
          slug: "basics",
          questions: [
            {
              type: "multiple_choice",
              question_en: "What?",
              question_es: "Que?",
            },
          ],
          flashcards: [
            {
              question_en: "Q",
              question_es: "P",
              answer_en: "A",
              answer_es: "R",
            },
          ],
        },
      ],
    };

    const result = await validateImportJson(data);
    expect(result.errors).toEqual([]);
    expect(result.topicTitle).toBe("Vaccines");
    expect(result.categoryCount).toBe(1);
    expect(result.questionCount).toBe(1);
    expect(result.flashcardCount).toBe(1);
  });

  it("reports missing required fields", async () => {
    const data = {
      categories: [
        {
          name_en: "Cat",
          name_es: "Gato",
          slug: "cat",
          questions: [
            { type: "multiple_choice", question_es: "Hola" }, // missing question_en
          ],
        },
      ],
    };

    const result = await validateImportJson(data);
    expect(result.errors).toContain("Missing title_en");
    expect(result.errors).toContain("Missing title_es");
    expect(result.errors).toContain("Cat 0 Q0: missing question_en");
  });

  it("reports invalid data (non-object)", async () => {
    const result = await validateImportJson(null);
    expect(result.errors).toContain("Invalid JSON object");
  });

  it("reports empty categories array", async () => {
    const result = await validateImportJson({
      title_en: "T",
      title_es: "T",
      categories: [],
    });
    expect(result.errors).toContain("Missing or empty categories array");
  });

  it("reports missing category fields", async () => {
    const result = await validateImportJson({
      title_en: "T",
      title_es: "T",
      categories: [{ questions: [] }],
    });
    expect(result.errors).toContain("Category 0: missing name_en");
    expect(result.errors).toContain("Category 0: missing name_es");
    expect(result.errors).toContain("Category 0: missing slug");
  });

  it("validates flashcard required fields", async () => {
    const result = await validateImportJson({
      title_en: "T",
      title_es: "T",
      categories: [
        {
          name_en: "C",
          name_es: "C",
          slug: "c",
          questions: [],
          flashcards: [{ question_en: "Q" }], // missing question_es, answer_en, answer_es
        },
      ],
    });
    expect(result.errors).toContain("Cat 0 F0: missing question_es");
    expect(result.errors).toContain("Cat 0 F0: missing answer_en");
    expect(result.errors).toContain("Cat 0 F0: missing answer_es");
  });
});

// ─── importTopicJson ────────────────────────────────────────────────

describe("importTopicJson", () => {
  function buildValidTopic(): ImportTopic {
    return {
      title_en: "Test Topic",
      title_es: "Tema de prueba",
      description_en: "Desc",
      description_es: "Desc es",
      icon: null,
      color: null,
      categories: [
        {
          name_en: "Cat 1",
          name_es: "Cat 1 es",
          slug: "cat-1",
          questions: [
            {
              type: "multiple_choice",
              question_en: "Q1?",
              question_es: "P1?",
              options_en: ["A", "B"],
              options_es: ["A", "B"],
              correct_index: 0,
              explanation_en: null,
              explanation_es: null,
            },
          ],
          flashcards: [
            {
              question_en: "FQ",
              question_es: "FP",
              answer_en: "FA",
              answer_es: "FR",
            },
          ],
        },
      ],
    };
  }

  it("inserts topic, categories, questions, and flashcards", async () => {
    // Topic insert
    const topicInsertMock = vi.fn();
    const topicSelectMock = vi.fn();
    const topicSingleMock = vi
      .fn()
      .mockResolvedValue({ data: { id: "topic-1" }, error: null });

    // Category insert
    const catInsertMock = vi.fn();
    const catSelectMock = vi.fn();
    const catSingleMock = vi
      .fn()
      .mockResolvedValue({ data: { id: "cat-1" }, error: null });

    // Questions insert
    const questionsInsertMock = vi.fn().mockResolvedValue({ error: null });

    // Flashcards insert
    const flashcardsInsertMock = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.from
      // 1st call: topics insert
      .mockReturnValueOnce({ insert: topicInsertMock })
      // 2nd call: categories insert
      .mockReturnValueOnce({ insert: catInsertMock })
      // 3rd call: questions insert
      .mockReturnValueOnce({ insert: questionsInsertMock })
      // 4th call: flashcards insert
      .mockReturnValueOnce({ insert: flashcardsInsertMock });

    topicInsertMock.mockReturnValue({ select: topicSelectMock });
    topicSelectMock.mockReturnValue({ single: topicSingleMock });

    catInsertMock.mockReturnValue({ select: catSelectMock });
    catSelectMock.mockReturnValue({ single: catSingleMock });

    const result = await importTopicJson(buildValidTopic());

    expect(result.topicId).toBe("topic-1");
    expect(result.questionsInserted).toBe(1);
    expect(result.flashcardsInserted).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/topics");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/flashcards");
  });

  it("throws on topic insert failure", async () => {
    const topicInsertMock = vi.fn();
    const topicSelectMock = vi.fn();
    const topicSingleMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "Duplicate" } });

    mockSupabase.from.mockReturnValue({ insert: topicInsertMock });
    topicInsertMock.mockReturnValue({ select: topicSelectMock });
    topicSelectMock.mockReturnValue({ single: topicSingleMock });

    await expect(importTopicJson(buildValidTopic())).rejects.toThrow(
      "Topic insert failed: Duplicate",
    );
  });
});
