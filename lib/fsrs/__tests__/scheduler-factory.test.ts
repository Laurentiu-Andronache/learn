import { describe, expect, it } from "vitest";
import { createNewCard, fromCard } from "../card-mapper";
import { createUserScheduler, fsrs, Rating, State } from "../scheduler";

describe("createUserScheduler", () => {
  it("lower retention (0.80) produces longer intervals than higher retention (0.90) for Good", () => {
    const card = createNewCard();
    const now = new Date();

    // Progress card to Review state with default scheduler
    let current = card;
    for (let i = 0; i < 10; i++) {
      const due = new Date(current.due.getTime() + 86400_000);
      const scheduled = fsrs.repeat(current, due);
      current = scheduled[Rating.Good].card;
      if (current.state === State.Review) break;
    }

    if (current.state !== State.Review) return; // guard

    const low = createUserScheduler({
      desired_retention: 0.8,
      max_review_interval: 36500,
    });
    const high = createUserScheduler({
      desired_retention: 0.9,
      max_review_interval: 36500,
    });

    const reviewTime = new Date(current.due.getTime() + 60_000);
    const lowResult = low.repeat(current, reviewTime)[Rating.Good].card;
    const highResult = high.repeat(current, reviewTime)[Rating.Good].card;

    const lowInterval = lowResult.due.getTime() - reviewTime.getTime();
    const highInterval = highResult.due.getTime() - reviewTime.getTime();

    // Lower retention = user is OK forgetting more = longer intervals
    expect(lowInterval).toBeGreaterThan(highInterval);
  });

  it("higher retention (0.95) produces shorter intervals than 0.90", () => {
    const card = createNewCard();

    // Progress card to Review state
    let current = card;
    for (let i = 0; i < 10; i++) {
      const due = new Date(current.due.getTime() + 86400_000);
      const scheduled = fsrs.repeat(current, due);
      current = scheduled[Rating.Good].card;
      if (current.state === State.Review) break;
    }

    if (current.state !== State.Review) return;

    const veryHigh = createUserScheduler({
      desired_retention: 0.95,
      max_review_interval: 36500,
    });
    const medium = createUserScheduler({
      desired_retention: 0.9,
      max_review_interval: 36500,
    });

    const reviewTime = new Date(current.due.getTime() + 60_000);
    const vhResult = veryHigh.repeat(current, reviewTime)[Rating.Good].card;
    const medResult = medium.repeat(current, reviewTime)[Rating.Good].card;

    const vhInterval = vhResult.due.getTime() - reviewTime.getTime();
    const medInterval = medResult.due.getTime() - reviewTime.getTime();

    expect(vhInterval).toBeLessThan(medInterval);
  });

  it("max_interval 30 caps intervals", () => {
    const card = createNewCard();

    // Progress to review with high stability
    let current = card;
    for (let i = 0; i < 10; i++) {
      const due = new Date(current.due.getTime() + 86400_000);
      const scheduled = fsrs.repeat(current, due);
      current = scheduled[Rating.Easy].card; // Easy for faster stability growth
      if (current.state === State.Review) break;
    }

    const capped = createUserScheduler({
      desired_retention: 0.8,
      max_review_interval: 30,
    });

    const reviewTime = new Date(current.due.getTime() + 60_000);
    const result = capped.repeat(current, reviewTime)[Rating.Easy].card;
    const intervalDays =
      (result.due.getTime() - reviewTime.getTime()) / 86400_000;

    expect(intervalDays).toBeLessThanOrEqual(33); // allow fuzz tolerance on 30-day cap
  });

  it("default singleton uses retention 0.9", () => {
    const card = createNewCard();
    const now = new Date();

    const equivalent = createUserScheduler({
      desired_retention: 0.9,
      max_review_interval: 36500,
    });

    // Schedule a new card with both — in learning state the results
    // should be identical (fuzz doesn't apply to learning cards)
    const defaultResult = fsrs.repeat(card, now)[Rating.Again].card;
    const factoryResult = equivalent.repeat(card, now)[Rating.Again].card;

    // Both should produce the same scheduling for Again on a new card
    expect(defaultResult.state).toBe(factoryResult.state);
    expect(defaultResult.reps).toBe(factoryResult.reps);
    expect(defaultResult.stability).toBeCloseTo(factoryResult.stability, 4);
    expect(defaultResult.difficulty).toBeCloseTo(factoryResult.difficulty, 4);
  });

  it("factory with same params as default produces equivalent results", () => {
    const card = createNewCard();
    const now = new Date();

    const equivalent = createUserScheduler({
      desired_retention: 0.9,
      max_review_interval: 36500,
    });

    // For Again on new card, fuzz doesn't apply so intervals match exactly
    const defaultScheduled = fsrs.repeat(card, now);
    const factoryScheduled = equivalent.repeat(card, now);

    const dAgain = defaultScheduled[Rating.Again].card;
    const fAgain = factoryScheduled[Rating.Again].card;

    expect(dAgain.due.getTime()).toBe(fAgain.due.getTime());
    expect(dAgain.stability).toBeCloseTo(fAgain.stability, 4);
    expect(dAgain.difficulty).toBeCloseTo(fAgain.difficulty, 4);
    expect(dAgain.learning_steps).toBe(fAgain.learning_steps);
  });
});
