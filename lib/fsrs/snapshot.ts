import type { createClient } from "@/lib/supabase/server";

// --- Shared types & helpers for snapshot-based undo/reset ---

export type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface BeforeSnapshot {
  stability_before: number | null;
  difficulty_before: number | null;
  state_before: string | null;
  reps_before: number | null;
  lapses_before: number | null;
  elapsed_days_before: number | null;
  scheduled_days_before: number | null;
  last_review_before: string | null;
  due_before: string | null;
  learning_steps_before: number | null;
}

export const SNAPSHOT_SELECT =
  "id, flashcard_id, stability_before, difficulty_before, state_before, reps_before, lapses_before, elapsed_days_before, scheduled_days_before, last_review_before, due_before, learning_steps_before";

export function captureSnapshot(
  existingState: {
    stability: number;
    difficulty: number;
    state: string;
    reps: number;
    lapses: number;
    elapsed_days: number;
    scheduled_days: number;
    last_review: string | null;
    due: string;
    learning_steps?: number | null;
  } | null,
): BeforeSnapshot {
  if (!existingState) {
    return {
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
  }
  return {
    stability_before: existingState.stability,
    difficulty_before: existingState.difficulty,
    state_before: existingState.state,
    reps_before: existingState.reps,
    lapses_before: existingState.lapses,
    elapsed_days_before: existingState.elapsed_days,
    scheduled_days_before: existingState.scheduled_days,
    last_review_before: existingState.last_review,
    due_before: existingState.due,
    learning_steps_before: existingState.learning_steps ?? 0,
  };
}

export async function restoreFromSnapshot(
  supabase: AppSupabaseClient,
  userId: string,
  flashcardId: string,
  snapshot: BeforeSnapshot,
) {
  if (snapshot.state_before === null) {
    await supabase
      .from("user_card_state")
      .delete()
      .eq("user_id", userId)
      .eq("flashcard_id", flashcardId);
  } else {
    await supabase
      .from("user_card_state")
      .update({
        stability: snapshot.stability_before,
        difficulty: snapshot.difficulty_before,
        state: snapshot.state_before,
        reps: snapshot.reps_before,
        lapses: snapshot.lapses_before,
        elapsed_days: snapshot.elapsed_days_before,
        scheduled_days: snapshot.scheduled_days_before,
        last_review: snapshot.last_review_before,
        due: snapshot.due_before,
        learning_steps: snapshot.learning_steps_before ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("flashcard_id", flashcardId);
  }
}

export async function insertReviewLog(
  supabase: AppSupabaseClient,
  params: {
    user_id: string;
    flashcard_id: string;
    card_state_id: string;
    rating: number;
    answer_time_ms: number | null;
  },
  snapshot: BeforeSnapshot,
) {
  const { error } = await supabase
    .from("review_logs")
    .insert({ ...params, ...snapshot });
  if (error) {
    console.error("Failed to insert review log:", error.message);
  }
}
