import type { Card } from "ts-fsrs";
import { createEmptyCard, State } from "ts-fsrs";

// DB user_card_state row type (matches schema)
export interface DbCardState {
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
  last_review: string | null;
  due: string;
  learning_steps: number;
}

// Map DB state string to ts-fsrs State enum
function mapState(dbState: string): State {
  switch (dbState) {
    case "new":
      return State.New;
    case "learning":
      return State.Learning;
    case "review":
      return State.Review;
    case "relearning":
      return State.Relearning;
    default:
      return State.New;
  }
}

// Map ts-fsrs State enum to DB state string
export function unmapState(state: State): DbCardState["state"] {
  switch (state) {
    case State.New:
      return "new";
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearning";
    default:
      return "new";
  }
}

// Convert DB row to ts-fsrs Card
export function toCard(dbState: DbCardState): Card {
  return {
    due: new Date(dbState.due),
    stability: dbState.stability,
    difficulty: dbState.difficulty,
    elapsed_days: dbState.elapsed_days,
    scheduled_days: dbState.scheduled_days,
    learning_steps: dbState.learning_steps,
    reps: dbState.reps,
    lapses: dbState.lapses,
    state: mapState(dbState.state),
    last_review: dbState.last_review
      ? new Date(dbState.last_review)
      : undefined,
  };
}

// Create a new card for questions never seen before
export function createNewCard(): Card {
  return createEmptyCard(new Date());
}

// Convert ts-fsrs Card back to DB fields
export function fromCard(card: Card): DbCardState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: unmapState(card.state),
    last_review: card.last_review ? card.last_review.toISOString() : null,
    due: card.due.toISOString(),
    learning_steps: card.learning_steps,
  };
}
