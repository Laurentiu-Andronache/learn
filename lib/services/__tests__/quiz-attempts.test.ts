import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1" } } })),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
  requireUserId: vi.fn(() =>
    Promise.resolve({ supabase: mockSupabase, userId: "user-1" }),
  ),
}));

import {
  getLatestQuizAttempt,
  getQuizAttempts,
  saveQuizAttempt,
} from "../quiz-attempts";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
});

// ─── saveQuizAttempt ─────────────────────────────────────────────────

describe("saveQuizAttempt", () => {
  it("inserts and returns the attempt id", async () => {
    const insertMock = vi.fn();
    const selectMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ insert: insertMock });
    insertMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({ data: { id: "attempt-1" }, error: null });

    const result = await saveQuizAttempt("topic-1", {
      score: 8,
      total: 10,
      answers: [
        {
          question_id: "q1",
          selected_index: 2,
          was_correct: true,
          time_ms: 3000,
        },
      ],
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("quiz_attempts");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      topic_id: "topic-1",
      score: 8,
      total: 10,
      answers: [
        {
          question_id: "q1",
          selected_index: 2,
          was_correct: true,
          time_ms: 3000,
        },
      ],
    });
    expect(result).toEqual({ id: "attempt-1" });
  });

  it("throws on schema cache error", async () => {
    const insertMock = vi.fn();
    const selectMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ insert: insertMock });
    insertMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({
      data: null,
      error: { message: "schema cache lookup failed", code: "PGRST204" },
    });

    await expect(
      saveQuizAttempt("topic-1", { score: 0, total: 5, answers: [] }),
    ).rejects.toThrow("schema cache lookup failed");
  });

  it("throws on unexpected error", async () => {
    const insertMock = vi.fn();
    const selectMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ insert: insertMock });
    insertMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(
      saveQuizAttempt("topic-1", { score: 0, total: 0, answers: [] }),
    ).rejects.toThrow("permission denied");
  });
});

// ─── getQuizAttempts ─────────────────────────────────────────────────

describe("getQuizAttempts", () => {
  it("returns attempts ordered by date", async () => {
    const mockData = [
      { id: "a1", score: 8, total: 10, completed_at: "2026-01-02" },
      { id: "a2", score: 5, total: 10, completed_at: "2026-01-01" },
    ];

    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();
    const orderMock = vi.fn();
    const limitMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ limit: limitMock });
    limitMock.mockResolvedValue({ data: mockData, error: null });

    const result = await getQuizAttempts("topic-1");
    expect(result).toEqual(mockData);
    expect(limitMock).toHaveBeenCalledWith(10);
  });

  it("uses custom limit", async () => {
    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();
    const orderMock = vi.fn();
    const limitMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ limit: limitMock });
    limitMock.mockResolvedValue({ data: [], error: null });

    await getQuizAttempts("topic-1", 5);
    expect(limitMock).toHaveBeenCalledWith(5);
  });

  it("throws on schema cache error", async () => {
    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();
    const orderMock = vi.fn();
    const limitMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ limit: limitMock });
    limitMock.mockResolvedValue({
      data: null,
      error: { message: "schema cache lookup", code: "PGRST204" },
    });

    await expect(getQuizAttempts("topic-1")).rejects.toThrow(
      "schema cache lookup",
    );
  });
});

// ─── getLatestQuizAttempt ────────────────────────────────────────────

describe("getLatestQuizAttempt", () => {
  it("returns the latest attempt", async () => {
    const mockAttempt = { id: "a1", score: 9, total: 10 };

    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();
    const orderMock = vi.fn();
    const limitMock = vi.fn();
    const maybeSingleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ limit: limitMock });
    limitMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    maybeSingleMock.mockResolvedValue({ data: mockAttempt, error: null });

    const result = await getLatestQuizAttempt("topic-1");
    expect(result).toEqual(mockAttempt);
  });

  it("returns null when no attempts exist", async () => {
    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();
    const orderMock = vi.fn();
    const limitMock = vi.fn();
    const maybeSingleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ limit: limitMock });
    limitMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await getLatestQuizAttempt("topic-1");
    expect(result).toBeNull();
  });

  it("throws on schema cache error", async () => {
    const selectMock = vi.fn();
    const eq1Mock = vi.fn();
    const eq2Mock = vi.fn();
    const orderMock = vi.fn();
    const limitMock = vi.fn();
    const maybeSingleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eq1Mock });
    eq1Mock.mockReturnValue({ eq: eq2Mock });
    eq2Mock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ limit: limitMock });
    limitMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: { message: "schema cache", code: "PGRST204" },
    });

    await expect(getLatestQuizAttempt("topic-1")).rejects.toThrow(
      "schema cache",
    );
  });
});
