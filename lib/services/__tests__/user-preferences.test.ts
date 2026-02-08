import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

import {
  suspendQuestion,
  unsuspendQuestion,
  getSuspendedQuestions,
  hideTopic,
  unhideTopic,
  getHiddenTopics,
  updateReadingProgress,
  getReadingProgress,
  updateProfile,
  getProfile,
} from "../user-preferences";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── SUSPENDED QUESTIONS ────────────────────────────────────────────

describe("suspendQuestion", () => {
  it("upserts a suspended question with reason", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ upsert: upsertMock });

    await suspendQuestion("user-1", "q-1", "too_easy");

    expect(mockSupabase.from).toHaveBeenCalledWith("suspended_questions");
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "user-1", question_id: "q-1", reason: "too_easy" },
      { onConflict: "user_id,question_id" },
    );
  });

  it("sets reason to null when not provided", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ upsert: upsertMock });

    await suspendQuestion("user-1", "q-1");

    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "user-1", question_id: "q-1", reason: null },
      { onConflict: "user_id,question_id" },
    );
  });

  it("throws on error", async () => {
    const upsertMock = vi
      .fn()
      .mockResolvedValue({ error: { message: "Constraint" } });
    mockSupabase.from.mockReturnValue({ upsert: upsertMock });

    await expect(suspendQuestion("user-1", "q-1")).rejects.toThrow(
      "Constraint",
    );
  });
});

describe("unsuspendQuestion", () => {
  it("deletes by user_id and question_id", async () => {
    const deleteMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();

    mockSupabase.from.mockReturnValue({ delete: deleteMock });
    deleteMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockResolvedValue({ error: null });

    await unsuspendQuestion("user-1", "q-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("suspended_questions");
    expect(eq1Mock).toHaveBeenCalledWith("user_id", "user-1");
    expect(eq2Mock).toHaveBeenCalledWith("question_id", "q-1");
  });
});

describe("getSuspendedQuestions", () => {
  it("returns suspended questions with nested question/category data", async () => {
    const mockData = [
      {
        id: "sq-1",
        reason: "too_hard",
        suspended_at: "2026-01-01T00:00:00Z",
        question: {
          id: "q-1",
          question_en: "Q?",
          question_es: "P?",
          category: { name_en: "Cat", name_es: "Cat" },
        },
      },
    ];

    const selectMock = vi.fn();
    const eqMock = vi.fn();
    const orderMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ order: orderMock });
    orderMock.mockResolvedValue({ data: mockData, error: null });

    const result = await getSuspendedQuestions("user-1");
    expect(result).toEqual(mockData);
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("returns empty array when no data", async () => {
    const selectMock = vi.fn();
    const eqMock = vi.fn();
    const orderMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ order: orderMock });
    orderMock.mockResolvedValue({ data: null, error: null });

    const result = await getSuspendedQuestions("user-1");
    expect(result).toEqual([]);
  });
});

// ─── HIDDEN TOPICS ──────────────────────────────────────────────────

describe("hideTopic", () => {
  it("upserts a hidden theme", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ upsert: upsertMock });

    await hideTopic("user-1", "theme-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("hidden_themes");
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "user-1", theme_id: "theme-1" },
      { onConflict: "user_id,theme_id" },
    );
  });
});

describe("unhideTopic", () => {
  it("deletes the hidden theme record", async () => {
    const deleteMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();

    mockSupabase.from.mockReturnValue({ delete: deleteMock });
    deleteMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockResolvedValue({ error: null });

    await unhideTopic("user-1", "theme-1");

    expect(eq1Mock).toHaveBeenCalledWith("user_id", "user-1");
    expect(eq2Mock).toHaveBeenCalledWith("theme_id", "theme-1");
  });
});

describe("getHiddenTopics", () => {
  it("returns hidden topics with theme details", async () => {
    const mockData = [
      {
        id: "ht-1",
        hidden_at: "2026-01-01",
        theme: { id: "t1", title_en: "T", title_es: "T", icon: null, color: null },
      },
    ];

    const selectMock = vi.fn();
    const eqMock = vi.fn();
    const orderMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ order: orderMock });
    orderMock.mockResolvedValue({ data: mockData, error: null });

    const result = await getHiddenTopics("user-1");
    expect(result).toEqual(mockData);
  });
});

// ─── READING PROGRESS ───────────────────────────────────────────────

describe("updateReadingProgress", () => {
  it("updates existing reading progress record", async () => {
    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();
    const eq3Mock = vi.fn();
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValue({ data: { id: "rp-1" } });

    // First call: SELECT to check existing
    mockSupabase.from.mockReturnValueOnce({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockReturnValue({ eq: eq3Mock });
    eq3Mock.mockReturnValue({ maybeSingle: maybeSingleMock });

    // Second call: UPDATE
    const updateMock = vi.fn();
    const updateEqMock = vi.fn();
    mockSupabase.from.mockReturnValueOnce({ update: updateMock });
    updateMock.mockReturnValue({ eq: updateEqMock });
    updateEqMock.mockResolvedValue({ error: null });

    await updateReadingProgress("user-1", "theme-1", "cat-1", 3, 75);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        current_section: 3,
        completion_percent: 75,
      }),
    );
    expect(updateEqMock).toHaveBeenCalledWith("id", "rp-1");
  });

  it("inserts new reading progress when none exists", async () => {
    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();
    const eq3Mock = vi.fn();
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null });

    mockSupabase.from.mockReturnValueOnce({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockReturnValue({ eq: eq3Mock });
    eq3Mock.mockReturnValue({ maybeSingle: maybeSingleMock });

    // INSERT
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValueOnce({ insert: insertMock });

    await updateReadingProgress("user-1", "theme-1", "cat-1", 0, 0);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        theme_id: "theme-1",
        category_id: "cat-1",
        current_section: 0,
        completion_percent: 0,
      }),
    );
  });

  it("uses IS NULL check when category_id is null", async () => {
    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();
    const isMock = vi.fn();
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null });

    mockSupabase.from.mockReturnValueOnce({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockReturnValue({ is: isMock });
    isMock.mockReturnValue({ maybeSingle: maybeSingleMock });

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValueOnce({ insert: insertMock });

    await updateReadingProgress("user-1", "theme-1", null, 1, 50);

    expect(isMock).toHaveBeenCalledWith("category_id", null);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: null }),
    );
  });
});

describe("getReadingProgress", () => {
  it("returns reading progress for user/theme", async () => {
    const mockData = [{ id: "rp-1", current_section: 2, completion_percent: 50 }];

    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockResolvedValue({ data: mockData, error: null });

    const result = await getReadingProgress("user-1", "theme-1");
    expect(result).toEqual(mockData);
  });

  it("returns empty array on null data", async () => {
    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockResolvedValue({ data: null, error: null });

    const result = await getReadingProgress("user-1", "theme-1");
    expect(result).toEqual([]);
  });
});

// ─── PROFILE ────────────────────────────────────────────────────────

describe("updateProfile", () => {
  it("updates profile with provided fields plus updated_at", async () => {
    const updateMock = vi.fn();
    const eqMock = vi.fn();

    mockSupabase.from.mockReturnValue({ update: updateMock });
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await updateProfile("user-1", { display_name: "Alice" });

    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: "Alice" }),
    );
    // Should include updated_at
    const arg = updateMock.mock.calls[0][0];
    expect(arg.updated_at).toBeDefined();
  });

  it("updates preferred_language", async () => {
    const updateMock = vi.fn();
    const eqMock = vi.fn();

    mockSupabase.from.mockReturnValue({ update: updateMock });
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await updateProfile("user-1", { preferred_language: "es" });

    const arg = updateMock.mock.calls[0][0];
    expect(arg.preferred_language).toBe("es");
  });
});

describe("getProfile", () => {
  it("returns single profile by id", async () => {
    const mockProfile = {
      id: "user-1",
      display_name: "Alice",
      preferred_language: "en",
    };

    const selectMock = vi.fn();
    const eqMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({ data: mockProfile, error: null });

    const result = await getProfile("user-1");
    expect(result).toEqual(mockProfile);
    expect(eqMock).toHaveBeenCalledWith("id", "user-1");
  });

  it("throws when profile not found", async () => {
    const selectMock = vi.fn();
    const eqMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({
      data: null,
      error: { message: "No rows" },
    });

    await expect(getProfile("user-bad")).rejects.toThrow("No rows");
  });
});
