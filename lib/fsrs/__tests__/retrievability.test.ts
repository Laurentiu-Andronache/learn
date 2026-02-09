import { describe, expect, it } from "vitest";
import type { UserCardState } from "@/lib/types/database";
import { getRetrievability } from "../interval-preview";

function makeState(overrides: Partial<UserCardState>): UserCardState {
  return {
    id: "cs-1",
    user_id: "u-1",
    flashcard_id: "f-1",
    stability: 5,
    difficulty: 0.3,
    elapsed_days: 1,
    scheduled_days: 5,
    reps: 3,
    lapses: 0,
    state: "review",
    last_review: new Date(Date.now() - 86400000).toISOString(),
    due: new Date(Date.now() + 86400000 * 4).toISOString(),
    learning_steps: 0,
    times_correct: 3,
    times_incorrect: 0,
    times_idk: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-02-07T12:00:00Z",
    ...overrides,
  };
}

describe("getRetrievability", () => {
  it("null state returns null", () => {
    expect(getRetrievability(null)).toBeNull();
  });

  it("card with state 'new' returns null", () => {
    const state = makeState({ state: "new" });
    expect(getRetrievability(state)).toBeNull();
  });

  it("card in review state with future due returns close to target retention", () => {
    // Card due in 4 days, reviewed 1 day ago, stability=5
    // Should have retrievability reasonably close to 0.9 target
    const state = makeState({
      state: "review",
      stability: 5,
      last_review: new Date(Date.now() - 86400000).toISOString(),
      due: new Date(Date.now() + 86400000 * 4).toISOString(),
    });

    const r = getRetrievability(state);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0.5);
    expect(r!).toBeLessThanOrEqual(1.0);
  });

  it("card overdue returns lower retrievability", () => {
    // Card was due 10 days ago — stability=5 means it should be quite forgotten
    const state = makeState({
      state: "review",
      stability: 5,
      last_review: new Date(Date.now() - 86400000 * 15).toISOString(),
      due: new Date(Date.now() - 86400000 * 10).toISOString(),
    });

    const r = getRetrievability(state);
    expect(r).not.toBeNull();

    // Compare with a card that's not overdue
    const freshState = makeState({
      state: "review",
      stability: 5,
      last_review: new Date(Date.now() - 86400000).toISOString(),
      due: new Date(Date.now() + 86400000 * 4).toISOString(),
    });

    const rFresh = getRetrievability(freshState);
    expect(rFresh).not.toBeNull();
    expect(r!).toBeLessThan(rFresh!);
  });
});
