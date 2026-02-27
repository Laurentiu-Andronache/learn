import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuth: vi.fn(),
  callAnthropicAPI: vi.fn(),
  stripCodeFences: vi.fn((s: string) => s),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mocks.mockFrom,
    auth: { getUser: mocks.mockAuth },
  })),
}));

vi.mock("@/lib/services/anthropic", () => ({
  callAnthropicAPI: mocks.callAnthropicAPI,
  stripCodeFences: mocks.stripCodeFences,
}));

import { translateTopicContent } from "../anki-translate";

const originalApiKey = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
  mocks.stripCodeFences.mockImplementation((s: string) => s);
});

afterEach(() => {
  if (originalApiKey !== undefined) {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  } else {
    delete process.env.ANTHROPIC_API_KEY;
  }
});

// ─── EARLY RETURNS ──────────────────────────────────────────────────

describe("translateTopicContent", () => {
  it("returns early when ANTHROPIC_API_KEY not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await translateTopicContent("topic-1", "en");

    expect(mocks.mockFrom).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("returns early when no categories found", async () => {
    // categories query returns empty
    const selectMock = vi.fn();
    const eqMock = vi.fn();

    mocks.mockFrom.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ data: [] });

    await translateTopicContent("topic-1", "en");

    expect(mocks.callAnthropicAPI).not.toHaveBeenCalled();
  });

  it("returns early when no flashcards found", async () => {
    // categories query returns data
    const catSelectMock = vi.fn();
    const catEqMock = vi.fn();

    // flashcards query returns empty
    const fcSelectMock = vi.fn();
    const fcInMock = vi.fn();

    mocks.mockFrom
      .mockReturnValueOnce({ select: catSelectMock }) // categories
      .mockReturnValueOnce({ select: fcSelectMock }); // flashcards

    catSelectMock.mockReturnValue({ eq: catEqMock });
    catEqMock.mockResolvedValue({ data: [{ id: "cat-1" }] });

    fcSelectMock.mockReturnValue({ in: fcInMock });
    fcInMock.mockResolvedValue({ data: [] });

    await translateTopicContent("topic-1", "en");

    expect(mocks.callAnthropicAPI).not.toHaveBeenCalled();
  });

  // ─── BATCH TRANSLATION ─────────────────────────────────────────────

  it("translates flashcards in batches and updates DB", async () => {
    const flashcards = [
      {
        id: "fc-1",
        question_en: "What?",
        question_es: "",
        answer_en: "That.",
        answer_es: "",
        extra_en: null,
        extra_es: null,
      },
    ];

    // categories query
    const catSelectMock = vi.fn();
    const catEqMock = vi.fn();

    // flashcards query
    const fcSelectMock = vi.fn();
    const fcInMock = vi.fn();

    // flashcard update
    const updateMock = vi.fn();
    const updateEqMock = vi.fn();

    // topic metadata query
    const topicSelectMock = vi.fn();
    const topicEqMock = vi.fn();
    const topicSingleMock = vi.fn();

    // topic update
    const topicUpdateMock = vi.fn();
    const topicUpdateEqMock = vi.fn();

    // category names query
    const catNamesSelectMock = vi.fn();
    const catNamesEqMock = vi.fn();

    // category name update
    const catNameUpdateMock = vi.fn();
    const catNameUpdateEqMock = vi.fn();

    mocks.mockFrom
      .mockReturnValueOnce({ select: catSelectMock }) // 1: categories
      .mockReturnValueOnce({ select: fcSelectMock }) // 2: flashcards
      .mockReturnValueOnce({ update: updateMock }) // 3: flashcard update
      .mockReturnValueOnce({ select: topicSelectMock }) // 4: topic metadata
      .mockReturnValueOnce({ update: topicUpdateMock }) // 5: topic update
      .mockReturnValueOnce({ select: catNamesSelectMock }) // 6: category names
      .mockReturnValueOnce({ update: catNameUpdateMock }); // 7: category name update

    catSelectMock.mockReturnValue({ eq: catEqMock });
    catEqMock.mockResolvedValue({ data: [{ id: "cat-1" }] });

    fcSelectMock.mockReturnValue({ in: fcInMock });
    fcInMock.mockResolvedValue({ data: flashcards });

    updateMock.mockReturnValue({ eq: updateEqMock });
    updateEqMock.mockResolvedValue({ error: null });

    topicSelectMock.mockReturnValue({ eq: topicEqMock });
    topicEqMock.mockReturnValue({ single: topicSingleMock });
    topicSingleMock.mockResolvedValue({
      data: {
        title_en: "My Topic",
        title_es: "",
        description_en: "Desc",
        description_es: "",
      },
    });

    topicUpdateMock.mockReturnValue({ eq: topicUpdateEqMock });
    topicUpdateEqMock.mockResolvedValue({ error: null });

    catNamesSelectMock.mockReturnValue({ eq: catNamesEqMock });
    catNamesEqMock.mockResolvedValue({
      data: [{ id: "cat-1", name_en: "Basics", name_es: "" }],
    });

    catNameUpdateMock.mockReturnValue({ eq: catNameUpdateEqMock });
    catNameUpdateEqMock.mockResolvedValue({ error: null });

    // First API call: flashcard batch translation
    mocks.callAnthropicAPI.mockResolvedValueOnce(
      JSON.stringify([
        { id: "fc-1", question: "Que?", answer: "Eso.", extra: null },
      ]),
    );

    // Second API call: topic metadata translation
    mocks.callAnthropicAPI.mockResolvedValueOnce(
      JSON.stringify({ title: "Mi Tema", description: "Descripcion" }),
    );

    // Third API call: category name translation
    mocks.callAnthropicAPI.mockResolvedValueOnce("Basicos");

    await translateTopicContent("topic-1", "en");

    expect(mocks.callAnthropicAPI).toHaveBeenCalledTimes(3);
    // Verify flashcard update was called
    expect(updateMock).toHaveBeenCalled();
    expect(updateEqMock).toHaveBeenCalledWith("id", "fc-1");
  });

  // ─── TOPIC METADATA TRANSLATION ───────────────────────────────────

  it("translates topic metadata (title + description)", async () => {
    // Minimal setup: no flashcards but still translate topic metadata
    const catSelectMock = vi.fn();
    const catEqMock = vi.fn();
    const fcSelectMock = vi.fn();
    const fcInMock = vi.fn();

    // topic metadata
    const topicSelectMock = vi.fn();
    const topicEqMock = vi.fn();
    const topicSingleMock = vi.fn();
    const topicUpdateMock = vi.fn();
    const topicUpdateEqMock = vi.fn();

    // category names
    const catNamesSelectMock = vi.fn();
    const catNamesEqMock = vi.fn();

    mocks.mockFrom
      .mockReturnValueOnce({ select: catSelectMock }) // categories
      .mockReturnValueOnce({ select: fcSelectMock }) // flashcards - has data so we proceed
      .mockReturnValueOnce({ select: topicSelectMock }) // topic metadata
      .mockReturnValueOnce({ update: topicUpdateMock }) // topic update
      .mockReturnValueOnce({ select: catNamesSelectMock }); // category names

    catSelectMock.mockReturnValue({ eq: catEqMock });
    catEqMock.mockResolvedValue({ data: [{ id: "cat-1" }] });

    fcSelectMock.mockReturnValue({ in: fcInMock });
    // Return one flashcard so we don't early-return
    fcInMock.mockResolvedValue({
      data: [
        {
          id: "fc-1",
          question_en: "Q",
          question_es: "",
          answer_en: "A",
          answer_es: "",
          extra_en: null,
          extra_es: null,
        },
      ],
    });

    // Flashcard batch — throws to skip flashcard update, but continues to metadata
    mocks.callAnthropicAPI.mockRejectedValueOnce(new Error("batch fail"));

    topicSelectMock.mockReturnValue({ eq: topicEqMock });
    topicEqMock.mockReturnValue({ single: topicSingleMock });
    topicSingleMock.mockResolvedValue({
      data: {
        title_en: "T",
        title_es: "",
        description_en: "D",
        description_es: "",
      },
    });

    mocks.callAnthropicAPI.mockResolvedValueOnce(
      JSON.stringify({ title: "T-es", description: "D-es" }),
    );

    topicUpdateMock.mockReturnValue({ eq: topicUpdateEqMock });
    topicUpdateEqMock.mockResolvedValue({ error: null });

    catNamesSelectMock.mockReturnValue({ eq: catNamesEqMock });
    catNamesEqMock.mockResolvedValue({ data: [] }); // no categories to translate

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await translateTopicContent("topic-1", "en");
    spy.mockRestore();

    // Verify topic update was attempted with the translated data
    expect(topicUpdateMock).toHaveBeenCalled();
  });

  // ─── BATCH FAILURE CONTINUES ──────────────────────────────────────

  it("continues with next batch on translation failure", async () => {
    // Create 15 flashcards to trigger 2 batches (BATCH_SIZE=10)
    const flashcards = Array.from({ length: 15 }, (_, i) => ({
      id: `fc-${i}`,
      question_en: `Q${i}`,
      question_es: "",
      answer_en: `A${i}`,
      answer_es: "",
      extra_en: null,
      extra_es: null,
    }));

    const catSelectMock = vi.fn();
    const catEqMock = vi.fn();
    const fcSelectMock = vi.fn();
    const fcInMock = vi.fn();

    // For second batch flashcard updates (5 cards)
    const updateMocks = Array.from({ length: 5 }, () => {
      const updateMock = vi.fn();
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      updateMock.mockReturnValue({ eq: eqMock });
      return { update: updateMock };
    });

    // topic metadata
    const topicSelectMock = vi.fn();
    const topicEqMock = vi.fn();
    const topicSingleMock = vi.fn().mockResolvedValue({ data: null });

    // category names
    const catNamesSelectMock = vi.fn();
    const catNamesEqMock = vi.fn();

    mocks.mockFrom
      .mockReturnValueOnce({ select: catSelectMock }) // categories
      .mockReturnValueOnce({ select: fcSelectMock }); // flashcards

    // After first 2 calls: batch 1 fails, batch 2 succeeds with 5 updates
    for (const m of updateMocks) {
      mocks.mockFrom.mockReturnValueOnce(m);
    }

    mocks.mockFrom
      .mockReturnValueOnce({ select: topicSelectMock }) // topic metadata
      .mockReturnValueOnce({ select: catNamesSelectMock }); // category names

    catSelectMock.mockReturnValue({ eq: catEqMock });
    catEqMock.mockResolvedValue({ data: [{ id: "cat-1" }] });

    fcSelectMock.mockReturnValue({ in: fcInMock });
    fcInMock.mockResolvedValue({ data: flashcards });

    // First batch fails
    mocks.callAnthropicAPI.mockRejectedValueOnce(new Error("rate limited"));

    // Second batch succeeds
    const batch2Response = flashcards.slice(10).map((fc) => ({
      id: fc.id,
      question: `${fc.question_en}_es`,
      answer: `${fc.answer_en}_es`,
      extra: null,
    }));
    mocks.callAnthropicAPI.mockResolvedValueOnce(
      JSON.stringify(batch2Response),
    );

    topicSelectMock.mockReturnValue({ eq: topicEqMock });
    topicEqMock.mockReturnValue({ single: topicSingleMock });

    catNamesSelectMock.mockReturnValue({ eq: catNamesEqMock });
    catNamesEqMock.mockResolvedValue({ data: [] });

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await translateTopicContent("topic-1", "en");
    spy.mockRestore();

    // callAnthropicAPI called at least twice (batch 1 fail + batch 2 success)
    expect(mocks.callAnthropicAPI).toHaveBeenCalledTimes(2);
    // Second batch should have triggered updates
    expect(updateMocks[0].update).toHaveBeenCalled();
  });
});
