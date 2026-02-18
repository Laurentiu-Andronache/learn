import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ──────────────────────────────────────────────────────

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/services/user-preferences", () => ({
  getFsrsSettings: vi.fn(() =>
    Promise.resolve({
      desired_retention: 0.9,
      max_review_interval: 36500,
      new_cards_per_day: 10,
      new_cards_ramp_up: true,
      show_review_time: true,
      read_questions_aloud: false,
      fsrs_weights: null,
      fsrs_weights_updated_at: null,
    }),
  ),
}));

vi.mock("next/server", () => ({
  after: vi.fn((fn: () => void) => {
    // no-op in tests — don't run auto-optimization
  }),
}));

vi.mock("@/lib/topics/topic-flashcard-ids", () => ({
  getFlashcardIdsForTopic: vi.fn(() => Promise.resolve(["f1", "f2"])),
}));

import { getFlashcardIdsForTopic } from "@/lib/topics/topic-flashcard-ids";
import {
  buryFlashcard,
  resetTodayProgress,
  scheduleFlashcardReview,
  undoLastReview,
} from "../actions";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────

/** Build a chained mock: from(table).method(...).method2(...)... */
function _chainMock(resolvedValue: unknown) {
  return {
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(resolvedValue),
      }),
    }),
  };
}

// ─── scheduleFlashcardReview ─────────────────────────────────────────

describe("scheduleFlashcardReview", () => {
  it("inserts new card state when no existing state", async () => {
    const insertSelectSingle = vi.fn().mockResolvedValue({
      data: { id: "cs-new" },
      error: null,
    });
    const insertSelect = vi
      .fn()
      .mockReturnValue({ single: insertSelectSingle });
    const insertFn = vi.fn().mockReturnValue({ select: insertSelect });

    const reviewInsert = vi.fn().mockResolvedValue({ error: null });

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "user_card_state") {
        fromCallCount++;
        if (fromCallCount === 1) {
          // First call: select existing → not found
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
          };
        }
        // Second call: insert new card state
        return { insert: insertFn };
      }
      if (table === "review_logs") {
        return { insert: reviewInsert };
      }
      return {};
    });

    const result = await scheduleFlashcardReview("user-1", "f1", 3);

    expect(result.cardStateId).toBe("cs-new");
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        flashcard_id: "f1",
      }),
    );
    expect(reviewInsert).toHaveBeenCalled();
  });

  it("updates existing card state", async () => {
    const existingState = {
      id: "cs-1",
      stability: 5,
      difficulty: 0.3,
      state: "review",
      reps: 3,
      lapses: 1,
      elapsed_days: 2,
      scheduled_days: 5,
      last_review: "2026-01-10T00:00:00.000Z",
      due: "2026-01-15T00:00:00.000Z",
      learning_steps: 0,
      times_correct: 5,
      times_incorrect: 1,
      times_idk: 0,
    };

    const updateSelectSingle = vi.fn().mockResolvedValue({
      data: { id: "cs-1" },
      error: null,
    });
    const updateSelect = vi
      .fn()
      .mockReturnValue({ single: updateSelectSingle });
    const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

    const reviewInsert = vi.fn().mockResolvedValue({ error: null });

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "user_card_state") {
        fromCallCount++;
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existingState }),
                }),
              }),
            }),
          };
        }
        return { update: updateFn };
      }
      if (table === "review_logs") {
        return { insert: reviewInsert };
      }
      return {};
    });

    const result = await scheduleFlashcardReview("user-1", "f1", 3);

    expect(result.cardStateId).toBe("cs-1");
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        times_correct: 6, // 5 + 1 for Good
        times_incorrect: 1,
        times_idk: 0,
      }),
    );
  });

  it("increments times_idk for Again rating", async () => {
    const existingState = {
      id: "cs-1",
      stability: 5,
      difficulty: 0.3,
      state: "review",
      reps: 3,
      lapses: 1,
      elapsed_days: 2,
      scheduled_days: 5,
      last_review: "2026-01-10T00:00:00.000Z",
      due: "2026-01-15T00:00:00.000Z",
      learning_steps: 0,
      times_correct: 2,
      times_incorrect: 1,
      times_idk: 0,
    };

    const updateSelectSingle = vi.fn().mockResolvedValue({
      data: { id: "cs-1" },
      error: null,
    });
    const updateSelect = vi
      .fn()
      .mockReturnValue({ single: updateSelectSingle });
    const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "user_card_state") {
        fromCallCount++;
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existingState }),
                }),
              }),
            }),
          };
        }
        return { update: updateFn };
      }
      if (table === "review_logs") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    await scheduleFlashcardReview("user-1", "f1", 1); // Again

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        times_correct: 2, // unchanged
        times_incorrect: 1, // unchanged
        times_idk: 1, // 0 + 1
      }),
    );
  });

  it("increments times_incorrect for Hard rating", async () => {
    const existingState = {
      id: "cs-1",
      stability: 5,
      difficulty: 0.3,
      state: "review",
      reps: 3,
      lapses: 1,
      elapsed_days: 2,
      scheduled_days: 5,
      last_review: "2026-01-10T00:00:00.000Z",
      due: "2026-01-15T00:00:00.000Z",
      learning_steps: 0,
      times_correct: 2,
      times_incorrect: 1,
      times_idk: 0,
    };

    const updateSelectSingle = vi.fn().mockResolvedValue({
      data: { id: "cs-1" },
      error: null,
    });
    const updateSelect = vi
      .fn()
      .mockReturnValue({ single: updateSelectSingle });
    const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "user_card_state") {
        fromCallCount++;
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existingState }),
                }),
              }),
            }),
          };
        }
        return { update: updateFn };
      }
      if (table === "review_logs") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    await scheduleFlashcardReview("user-1", "f1", 2); // Hard

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        times_correct: 2, // unchanged
        times_incorrect: 2, // 1 + 1
        times_idk: 0,
      }),
    );
  });

  it("throws when insert fails", async () => {
    let fromCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "user_card_state") {
        fromCallCount++;
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
          };
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "insert failed" },
              }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(scheduleFlashcardReview("user-1", "f1", 3)).rejects.toThrow(
      "Failed to insert card state: insert failed",
    );
  });
});

// ─── buryFlashcard ───────────────────────────────────────────────────

describe("buryFlashcard", () => {
  it("updates due date when card state exists", async () => {
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEqMock });

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // select existing
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "cs-1" } }),
              }),
            }),
          }),
        };
      }
      // update
      return { update: updateFn };
    });

    await buryFlashcard("user-1", "f1");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ due: expect.any(String) }),
    );
    expect(updateEqMock).toHaveBeenCalledWith("id", "cs-1");
  });

  it("inserts new card state when none exists", async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        };
      }
      return { insert: insertFn };
    });

    await buryFlashcard("user-1", "f1");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        flashcard_id: "f1",
        due: expect.any(String),
      }),
    );
  });

  it("throws when update fails", async () => {
    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "cs-1" } }),
              }),
            }),
          }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "update boom" } }),
        }),
      };
    });

    await expect(buryFlashcard("user-1", "f1")).rejects.toThrow(
      "Failed to bury card: update boom",
    );
  });
});

// ─── undoLastReview ──────────────────────────────────────────────────

describe("undoLastReview", () => {
  it("does nothing when no review log exists", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        }),
      }),
    }));

    // Should not throw
    await undoLastReview("user-1", "f1");
  });

  it("deletes log and restores snapshot when state_before is present", async () => {
    const snapshot = {
      id: "log-1",
      flashcard_id: "f1",
      stability_before: 5,
      difficulty_before: 0.3,
      state_before: "review",
      reps_before: 2,
      lapses_before: 0,
      elapsed_days_before: 1,
      scheduled_days_before: 5,
      last_review_before: "2026-01-10T00:00:00.000Z",
      due_before: "2026-01-15T00:00:00.000Z",
      learning_steps_before: 0,
    };

    const deleteMock = vi.fn();
    const deleteEqMock = vi.fn().mockResolvedValue({});
    deleteMock.mockReturnValue({ eq: deleteEqMock });

    const updateMock = vi.fn();
    const updateEq1 = vi.fn();
    const updateEq2 = vi.fn().mockResolvedValue({});
    updateMock.mockReturnValue({ eq: updateEq1 });
    updateEq1.mockReturnValue({ eq: updateEq2 });

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // select last log
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: snapshot }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (fromCallCount === 2) {
        // delete log
        return { delete: deleteMock };
      }
      // restore card state
      return { update: updateMock };
    });

    await undoLastReview("user-1", "f1");

    expect(deleteEqMock).toHaveBeenCalledWith("id", "log-1");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stability: 5,
        difficulty: 0.3,
        state: "review",
      }),
    );
  });

  it("deletes card state entirely when state_before is null (was new)", async () => {
    const snapshot = {
      id: "log-1",
      flashcard_id: "f1",
      stability_before: null,
      difficulty_before: null,
      state_before: null,
      reps_before: null,
      lapses_before: null,
      elapsed_days_before: null,
      scheduled_days_before: null,
      last_review_before: null,
      due_before: null,
      learning_steps_before: null,
    };

    const logDeleteEq = vi.fn().mockResolvedValue({});
    const logDelete = vi.fn().mockReturnValue({ eq: logDeleteEq });

    const stateDeleteEq1 = vi.fn();
    const stateDeleteEq2 = vi.fn().mockResolvedValue({});
    stateDeleteEq1.mockReturnValue({ eq: stateDeleteEq2 });
    const stateDelete = vi.fn().mockReturnValue({ eq: stateDeleteEq1 });

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: snapshot }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (fromCallCount === 2) {
        return { delete: logDelete };
      }
      // delete card state (state_before is null)
      return { delete: stateDelete };
    });

    await undoLastReview("user-1", "f1");

    expect(logDeleteEq).toHaveBeenCalledWith("id", "log-1");
    expect(stateDeleteEq1).toHaveBeenCalledWith("user_id", "user-1");
    expect(stateDeleteEq2).toHaveBeenCalledWith("flashcard_id", "f1");
  });
});

// ─── resetTodayProgress ──────────────────────────────────────────────

describe("resetTodayProgress", () => {
  it("returns 0 when no flashcard ids for topic", async () => {
    vi.mocked(getFlashcardIdsForTopic).mockResolvedValueOnce([]);

    const result = await resetTodayProgress("user-1", "topic-1");
    expect(result).toBe(0);
  });

  it("returns 0 when no review logs found today", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "review_logs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await resetTodayProgress("user-1", "topic-1");
    expect(result).toBe(0);
  });

  it("deletes today logs and restores first-log snapshots", async () => {
    const todayLogs = [
      {
        id: "log-1",
        flashcard_id: "f1",
        stability_before: 5,
        difficulty_before: 0.3,
        state_before: "review",
        reps_before: 2,
        lapses_before: 0,
        elapsed_days_before: 1,
        scheduled_days_before: 5,
        last_review_before: "2026-01-10T00:00:00.000Z",
        due_before: "2026-01-15T00:00:00.000Z",
        learning_steps_before: 0,
      },
      {
        id: "log-2",
        flashcard_id: "f1", // same card, second review today
        stability_before: 6,
        difficulty_before: 0.3,
        state_before: "review",
        reps_before: 3,
        lapses_before: 0,
        elapsed_days_before: 2,
        scheduled_days_before: 6,
        last_review_before: "2026-01-12T00:00:00.000Z",
        due_before: "2026-01-18T00:00:00.000Z",
        learning_steps_before: 0,
      },
    ];

    const deleteInMock = vi.fn().mockResolvedValue({});
    const deleteFn = vi.fn().mockReturnValue({ in: deleteInMock });

    const updateMock = vi.fn();
    const updateEq1 = vi.fn();
    const updateEq2 = vi.fn().mockResolvedValue({});
    updateMock.mockReturnValue({ eq: updateEq1 });
    updateEq1.mockReturnValue({ eq: updateEq2 });

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++;
      if (table === "review_logs" && fromCallCount === 1) {
        // select today's logs
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: todayLogs }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "review_logs") {
        // delete logs
        return { delete: deleteFn };
      }
      if (table === "user_card_state") {
        // restore snapshot
        return { update: updateMock };
      }
      return {};
    });

    const result = await resetTodayProgress("user-1", "topic-1");

    expect(result).toBe(2); // 2 logs deleted
    expect(deleteInMock).toHaveBeenCalledWith("id", ["log-1", "log-2"]);
    // Should restore from the FIRST log's snapshot (log-1), not log-2
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stability: 5, // from log-1's snapshot
      }),
    );
  });
});
