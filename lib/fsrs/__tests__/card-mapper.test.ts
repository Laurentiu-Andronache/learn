import { State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import {
  createNewCard,
  type DbCardState,
  fromCard,
  toCard,
} from "../card-mapper";

const makeDbState = (overrides: Partial<DbCardState> = {}): DbCardState => ({
  stability: 5.0,
  difficulty: 0.3,
  elapsed_days: 2,
  scheduled_days: 5,
  reps: 3,
  lapses: 1,
  state: "review",
  last_review: "2026-01-15T10:00:00.000Z",
  due: "2026-01-20T10:00:00.000Z",
  learning_steps: 0,
  ...overrides,
});

describe("card-mapper", () => {
  describe("toCard", () => {
    it("maps all numeric fields correctly", () => {
      const db = makeDbState();
      const card = toCard(db);
      expect(card.stability).toBe(5.0);
      expect(card.difficulty).toBe(0.3);
      expect(card.elapsed_days).toBe(2);
      expect(card.scheduled_days).toBe(5);
      expect(card.reps).toBe(3);
      expect(card.lapses).toBe(1);
    });

    it("converts due string to Date", () => {
      const card = toCard(makeDbState({ due: "2026-02-01T12:00:00.000Z" }));
      expect(card.due).toEqual(new Date("2026-02-01T12:00:00.000Z"));
    });

    it("converts last_review string to Date", () => {
      const card = toCard(
        makeDbState({ last_review: "2026-01-10T08:00:00.000Z" }),
      );
      expect(card.last_review).toEqual(new Date("2026-01-10T08:00:00.000Z"));
    });

    it("handles null last_review", () => {
      const card = toCard(makeDbState({ last_review: null }));
      expect(card.last_review).toBeUndefined();
    });

    it.each([
      ["new", State.New],
      ["learning", State.Learning],
      ["review", State.Review],
      ["relearning", State.Relearning],
    ] as const)("maps state '%s' to State.%s", (dbState, expected) => {
      const card = toCard(makeDbState({ state: dbState }));
      expect(card.state).toBe(expected);
    });

    it("defaults unknown state to State.New", () => {
      // Force an unknown state string through the mapper
      const card = toCard(
        makeDbState({ state: "bogus" as DbCardState["state"] }),
      );
      expect(card.state).toBe(State.New);
    });

    it("reads learning_steps from dbState", () => {
      const card = toCard(makeDbState({ learning_steps: 2 }));
      expect(card.learning_steps).toBe(2);
    });
  });

  describe("fromCard", () => {
    it("maps all numeric fields correctly", () => {
      const card = toCard(makeDbState());
      const db = fromCard(card);
      expect(db.stability).toBe(5.0);
      expect(db.difficulty).toBe(0.3);
      expect(db.elapsed_days).toBe(2);
      expect(db.scheduled_days).toBe(5);
      expect(db.reps).toBe(3);
      expect(db.lapses).toBe(1);
    });

    it("converts due Date to ISO string", () => {
      const card = toCard(makeDbState({ due: "2026-02-01T12:00:00.000Z" }));
      const db = fromCard(card);
      expect(db.due).toBe("2026-02-01T12:00:00.000Z");
    });

    it("converts last_review Date to ISO string", () => {
      const card = toCard(
        makeDbState({ last_review: "2026-01-10T08:00:00.000Z" }),
      );
      const db = fromCard(card);
      expect(db.last_review).toBe("2026-01-10T08:00:00.000Z");
    });

    it("converts undefined last_review to null", () => {
      const card = toCard(makeDbState({ last_review: null }));
      const db = fromCard(card);
      expect(db.last_review).toBeNull();
    });

    it.each([
      [State.New, "new"],
      [State.Learning, "learning"],
      [State.Review, "review"],
      [State.Relearning, "relearning"],
    ] as const)("maps State.%s to '%s'", (stateEnum, expected) => {
      const card = toCard(makeDbState());
      card.state = stateEnum;
      const db = fromCard(card);
      expect(db.state).toBe(expected);
    });
  });

  describe("roundtrip: toCard → fromCard", () => {
    it.each([
      "new",
      "learning",
      "review",
      "relearning",
    ] as const)("roundtrips state '%s' without loss", (state) => {
      const original = makeDbState({ state });
      const roundtripped = fromCard(toCard(original));
      expect(roundtripped.stability).toBe(original.stability);
      expect(roundtripped.difficulty).toBe(original.difficulty);
      expect(roundtripped.elapsed_days).toBe(original.elapsed_days);
      expect(roundtripped.scheduled_days).toBe(original.scheduled_days);
      expect(roundtripped.reps).toBe(original.reps);
      expect(roundtripped.lapses).toBe(original.lapses);
      expect(roundtripped.state).toBe(original.state);
      expect(roundtripped.due).toBe(original.due);
      expect(roundtripped.last_review).toBe(original.last_review);
    });

    it("roundtrips with null last_review", () => {
      const original = makeDbState({ last_review: null });
      const roundtripped = fromCard(toCard(original));
      expect(roundtripped.last_review).toBeNull();
    });
  });

  describe("learning_steps", () => {
    it("toCard reads learning_steps from DbCardState", () => {
      const card = toCard(makeDbState({ learning_steps: 3 }));
      expect(card.learning_steps).toBe(3);
    });

    it("fromCard writes learning_steps back", () => {
      const card = toCard(makeDbState({ learning_steps: 4 }));
      const db = fromCard(card);
      expect(db.learning_steps).toBe(4);
    });

    it.each([
      "new",
      "learning",
      "review",
      "relearning",
    ] as const)("roundtrip preserves learning_steps for state '%s'", (state) => {
      const original = makeDbState({ state, learning_steps: 2 });
      const roundtripped = fromCard(toCard(original));
      expect(roundtripped.learning_steps).toBe(2);
    });

    it("createNewCard() has learning_steps: 0", () => {
      const card = createNewCard();
      expect(card.learning_steps).toBe(0);
    });
  });

  describe("createNewCard", () => {
    it("returns a card with State.New", () => {
      const card = createNewCard();
      expect(card.state).toBe(State.New);
    });

    it("returns a card with 0 reps and lapses", () => {
      const card = createNewCard();
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
    });

    it("sets due to approximately now", () => {
      const before = Date.now();
      const card = createNewCard();
      const after = Date.now();
      expect(card.due.getTime()).toBeGreaterThanOrEqual(before);
      expect(card.due.getTime()).toBeLessThanOrEqual(after);
    });
  });
});
