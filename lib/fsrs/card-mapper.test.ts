import { State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { createNewCard, fromCard, toCard, type DbCardState } from "./card-mapper";

describe("card-mapper", () => {
  const sampleDbState: DbCardState = {
    stability: 4.5,
    difficulty: 5.2,
    elapsed_days: 3,
    scheduled_days: 7,
    reps: 5,
    lapses: 1,
    state: "review",
    last_review: "2026-01-15T10:00:00.000Z",
    due: "2026-01-22T10:00:00.000Z",
  };

  describe("toCard", () => {
    it("maps all DB fields to ts-fsrs Card", () => {
      const card = toCard(sampleDbState);
      expect(card.stability).toBe(4.5);
      expect(card.difficulty).toBe(5.2);
      expect(card.elapsed_days).toBe(3);
      expect(card.scheduled_days).toBe(7);
      expect(card.reps).toBe(5);
      expect(card.lapses).toBe(1);
      expect(card.state).toBe(State.Review);
      expect(card.due).toEqual(new Date("2026-01-22T10:00:00.000Z"));
      expect(card.last_review).toEqual(new Date("2026-01-15T10:00:00.000Z"));
    });

    it("maps all four state strings correctly", () => {
      expect(toCard({ ...sampleDbState, state: "new" }).state).toBe(State.New);
      expect(toCard({ ...sampleDbState, state: "learning" }).state).toBe(State.Learning);
      expect(toCard({ ...sampleDbState, state: "review" }).state).toBe(State.Review);
      expect(toCard({ ...sampleDbState, state: "relearning" }).state).toBe(State.Relearning);
    });

    it("handles null last_review", () => {
      const card = toCard({ ...sampleDbState, last_review: null });
      expect(card.last_review).toBeUndefined();
    });

    it("defaults unknown state to New", () => {
      // Force an unknown string via type assertion
      const card = toCard({ ...sampleDbState, state: "unknown" as DbCardState["state"] });
      expect(card.state).toBe(State.New);
    });
  });

  describe("fromCard", () => {
    it("roundtrips through toCard → fromCard", () => {
      const card = toCard(sampleDbState);
      const result = fromCard(card);
      expect(result.stability).toBe(sampleDbState.stability);
      expect(result.difficulty).toBe(sampleDbState.difficulty);
      expect(result.elapsed_days).toBe(sampleDbState.elapsed_days);
      expect(result.scheduled_days).toBe(sampleDbState.scheduled_days);
      expect(result.reps).toBe(sampleDbState.reps);
      expect(result.lapses).toBe(sampleDbState.lapses);
      expect(result.state).toBe(sampleDbState.state);
      expect(result.due).toBe(sampleDbState.due);
      expect(result.last_review).toBe(sampleDbState.last_review);
    });

    it("maps ts-fsrs State enums back to DB strings", () => {
      const card = toCard(sampleDbState);

      card.state = State.New;
      expect(fromCard(card).state).toBe("new");

      card.state = State.Learning;
      expect(fromCard(card).state).toBe("learning");

      card.state = State.Review;
      expect(fromCard(card).state).toBe("review");

      card.state = State.Relearning;
      expect(fromCard(card).state).toBe("relearning");
    });

    it("serializes null last_review", () => {
      const card = toCard({ ...sampleDbState, last_review: null });
      expect(fromCard(card).last_review).toBeNull();
    });
  });

  describe("createNewCard", () => {
    it("creates a card with New state and zero counters", () => {
      const card = createNewCard();
      expect(card.state).toBe(State.New);
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
      expect(card.stability).toBe(0);
      expect(card.difficulty).toBe(0);
      expect(card.elapsed_days).toBe(0);
      expect(card.scheduled_days).toBe(0);
    });

    it("has due date close to now", () => {
      const before = Date.now();
      const card = createNewCard();
      const after = Date.now();
      expect(card.due.getTime()).toBeGreaterThanOrEqual(before);
      expect(card.due.getTime()).toBeLessThanOrEqual(after);
    });
  });
});
