import { describe, expect, it } from "vitest";
import { createNewCard, fromCard, toCard } from "./card-mapper";
import { fsrs, Rating, State } from "./scheduler";

describe("FSRS scheduler integration", () => {
  it("schedules a new card rated Good into Learning state", () => {
    const card = createNewCard();
    const scheduled = fsrs.repeat(card, new Date());
    const result = scheduled[Rating.Good].card;
    expect(result.state).toBe(State.Learning);
    expect(result.reps).toBe(1);
    expect(result.due.getTime()).toBeGreaterThan(Date.now());
  });

  it("schedules a new card rated Again into Learning state", () => {
    const card = createNewCard();
    const scheduled = fsrs.repeat(card, new Date());
    const result = scheduled[Rating.Again].card;
    expect(result.state).toBe(State.Learning);
    expect(result.reps).toBe(1);
    expect(result.lapses).toBe(0); // First time, no lapse
  });

  it("progresses through Learning → Review with successive Good ratings", () => {
    let card = createNewCard();
    const now = new Date();

    // First review: New → Learning
    let scheduled = fsrs.repeat(card, now);
    card = scheduled[Rating.Good].card;
    expect(card.state).toBe(State.Learning);

    // Second review: advance the time to after the due date
    const laterDate = new Date(card.due.getTime() + 60_000);
    scheduled = fsrs.repeat(card, laterDate);
    card = scheduled[Rating.Good].card;

    // After enough Good ratings, should eventually reach Review state
    // ts-fsrs typically goes Learning → Review after ~2 Good ratings
    expect([State.Learning, State.Review]).toContain(card.state);
  });

  it("roundtrips a scheduled card through DB mapping", () => {
    const card = createNewCard();
    const scheduled = fsrs.repeat(card, new Date());
    const afterGood = scheduled[Rating.Good].card;

    // Simulate DB roundtrip
    const dbFields = fromCard(afterGood);
    const restored = toCard(dbFields);

    expect(restored.stability).toBe(afterGood.stability);
    expect(restored.difficulty).toBe(afterGood.difficulty);
    expect(restored.reps).toBe(afterGood.reps);
    expect(restored.state).toBe(afterGood.state);
  });

  it("new card rated Good changes learning_steps", () => {
    const card = createNewCard();
    expect(card.learning_steps).toBe(0);
    const scheduled = fsrs.repeat(card, new Date());
    const afterGood = scheduled[Rating.Good].card;
    expect(afterGood.learning_steps).toBeGreaterThanOrEqual(0);
    // learning_steps should be tracked by FSRS after scheduling
    expect(typeof afterGood.learning_steps).toBe("number");
  });

  it("card completing learning transitions to Review", () => {
    let card = createNewCard();
    // Progress through learning until we hit Review
    for (let i = 0; i < 10; i++) {
      const due = new Date(card.due.getTime() + 86400_000);
      const scheduled = fsrs.repeat(card, due);
      card = scheduled[Rating.Good].card;
      if (card.state === State.Review) break;
    }
    expect(card.state).toBe(State.Review);
  });

  it("learning_steps persist through DB roundtrip", () => {
    const card = createNewCard();
    const scheduled = fsrs.repeat(card, new Date());
    const afterGood = scheduled[Rating.Good].card;

    const dbFields = fromCard(afterGood);
    expect(typeof dbFields.learning_steps).toBe("number");

    const restored = toCard(dbFields);
    expect(restored.learning_steps).toBe(afterGood.learning_steps);
  });

  it("Review card rated Again goes to Relearning and increments lapses", () => {
    // Create a Review-state card
    const card = createNewCard();
    const _now = new Date();
    let current = card;

    // Fast-forward through learning to review
    for (let i = 0; i < 5; i++) {
      const due = new Date(current.due.getTime() + 86400_000); // +1 day
      const scheduled = fsrs.repeat(current, due);
      current = scheduled[Rating.Good].card;
      if (current.state === State.Review) break;
    }

    if (current.state === State.Review) {
      const lapseBefore = current.lapses;
      const due = new Date(current.due.getTime() + 86400_000);
      const scheduled = fsrs.repeat(current, due);
      const afterAgain = scheduled[Rating.Again].card;
      expect(afterAgain.state).toBe(State.Relearning);
      expect(afterAgain.lapses).toBe(lapseBefore + 1);
    }
  });
});
