"use server";

import type { Grade } from "ts-fsrs";
import { createNewCard, fromCard, toCard } from "@/lib/fsrs/card-mapper";
import { getAllTopicsProgress } from "@/lib/fsrs/progress";
import { createUserScheduler, Rating } from "@/lib/fsrs/scheduler";
import { getFsrsSettings } from "@/lib/services/user-preferences";
import { createClient } from "@/lib/supabase/server";
import { getFlashcardIdsForTopic } from "@/lib/topics/topic-flashcard-ids";

// --- Shared types & helpers for snapshot-based undo/reset ---

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface BeforeSnapshot {
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

const SNAPSHOT_SELECT =
  "id, flashcard_id, stability_before, difficulty_before, state_before, reps_before, lapses_before, elapsed_days_before, scheduled_days_before, last_review_before, due_before, learning_steps_before";

function captureSnapshot(
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

async function restoreFromSnapshot(
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

async function insertReviewLog(
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

// --- Exported server actions ---

export async function scheduleFlashcardReview(
  userId: string,
  flashcardId: string,
  rating: 1 | 2 | 3 | 4,
  answerTimeMs?: number,
) {
  const supabase = await createClient();

  // Fetch current card state + user FSRS settings in parallel
  const [{ data: existingState }, userSettings] = await Promise.all([
    supabase
      .from("user_card_state")
      .select("*")
      .eq("user_id", userId)
      .eq("flashcard_id", flashcardId)
      .single(),
    getFsrsSettings(userId),
  ]);

  const now = new Date();
  const card = existingState ? toCard(existingState) : createNewCard();

  const snapshot = captureSnapshot(existingState);

  // Run FSRS scheduling with per-user scheduler
  const scheduler = createUserScheduler({
    desired_retention: userSettings.desired_retention,
    max_review_interval: userSettings.max_review_interval,
  });
  const scheduled = scheduler.repeat(card, now);
  const newCard = scheduled[rating as Grade].card;
  const dbFields = fromCard(newCard);

  // Counter increments
  const isIdk = rating === Rating.Again;
  const isCorrect = rating === Rating.Good || rating === Rating.Easy;
  const isIncorrect = rating === Rating.Hard;
  const timesCorrectInc = isCorrect ? 1 : 0;
  const timesIncorrectInc = isIncorrect ? 1 : 0;
  const timesIdkInc = isIdk ? 1 : 0;

  // Upsert card state
  let cardStateId: string;
  if (existingState) {
    const { data: updated, error: updateError } = await supabase
      .from("user_card_state")
      .update({
        ...dbFields,
        times_correct: existingState.times_correct + timesCorrectInc,
        times_incorrect: existingState.times_incorrect + timesIncorrectInc,
        times_idk: existingState.times_idk + timesIdkInc,
        updated_at: now.toISOString(),
      })
      .eq("id", existingState.id)
      .select("id")
      .single();
    if (updateError || !updated) {
      throw new Error(
        `Failed to update card state: ${updateError?.message ?? "no data returned"}`,
      );
    }
    cardStateId = updated.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("user_card_state")
      .insert({
        user_id: userId,
        flashcard_id: flashcardId,
        ...dbFields,
        times_correct: timesCorrectInc,
        times_incorrect: timesIncorrectInc,
        times_idk: timesIdkInc,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      throw new Error(
        `Failed to insert card state: ${insertError?.message ?? "no data returned"}`,
      );
    }
    cardStateId = inserted.id;
  }

  await insertReviewLog(
    supabase,
    {
      user_id: userId,
      flashcard_id: flashcardId,
      card_state_id: cardStateId,
      rating,
      answer_time_ms: answerTimeMs ?? null,
    },
    snapshot,
  );

  return { cardStateId, newState: dbFields };
}

export async function buryFlashcard(userId: string, flashcardId: string) {
  const supabase = await createClient();

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const dueStr = tomorrow.toISOString();

  const { data: existing } = await supabase
    .from("user_card_state")
    .select("id")
    .eq("user_id", userId)
    .eq("flashcard_id", flashcardId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("user_card_state")
      .update({ due: dueStr, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(`Failed to bury card: ${error.message}`);
  } else {
    const card = createNewCard();
    const dbFields = fromCard(card);
    const { error } = await supabase.from("user_card_state").insert({
      user_id: userId,
      flashcard_id: flashcardId,
      ...dbFields,
      due: dueStr,
    });
    if (error) throw new Error(`Failed to bury card: ${error.message}`);
  }
}

export async function undoLastReview(userId: string, flashcardId: string) {
  const supabase = await createClient();

  const { data: lastLog } = await supabase
    .from("review_logs")
    .select(SNAPSHOT_SELECT)
    .eq("user_id", userId)
    .eq("flashcard_id", flashcardId)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastLog) return;

  await supabase.from("review_logs").delete().eq("id", lastLog.id);
  await restoreFromSnapshot(supabase, userId, flashcardId, lastLog);
}

export async function resetTodayProgress(
  userId: string,
  topicId: string,
): Promise<number> {
  const supabase = await createClient();
  const flashcardIds = await getFlashcardIdsForTopic(supabase, topicId);
  if (!flashcardIds.length) return 0;

  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);

  const { data: todayLogs } = await supabase
    .from("review_logs")
    .select(SNAPSHOT_SELECT)
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds)
    .gte("reviewed_at", todayMidnight.toISOString())
    .order("reviewed_at", { ascending: true });

  if (!todayLogs?.length) return 0;

  const firstLogByFlashcard = new Map<string, (typeof todayLogs)[0]>();
  for (const log of todayLogs) {
    if (!firstLogByFlashcard.has(log.flashcard_id)) {
      firstLogByFlashcard.set(log.flashcard_id, log);
    }
  }

  await supabase
    .from("review_logs")
    .delete()
    .in(
      "id",
      todayLogs.map((l) => l.id),
    );

  for (const [flashcardId, firstLog] of firstLogByFlashcard) {
    await restoreFromSnapshot(supabase, userId, flashcardId, firstLog);
  }

  return todayLogs.length;
}

export async function resetAllProgress(
  userId: string,
  topicId: string,
): Promise<{ reviewLogs: number; cardStates: number; suspended: number }> {
  const supabase = await createClient();
  const flashcardIds = await getFlashcardIdsForTopic(supabase, topicId);
  if (!flashcardIds.length)
    return { reviewLogs: 0, cardStates: 0, suspended: 0 };

  // Delete review logs first
  const { data: deletedLogs } = await supabase
    .from("review_logs")
    .delete()
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds)
    .select("id");

  // Delete card states
  const { data: deletedStates } = await supabase
    .from("user_card_state")
    .delete()
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds)
    .select("id");

  // Delete suspended flashcards
  const { data: deletedSuspended } = await supabase
    .from("suspended_flashcards")
    .delete()
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds)
    .select("id");

  return {
    reviewLogs: deletedLogs?.length ?? 0,
    cardStates: deletedStates?.length ?? 0,
    suspended: deletedSuspended?.length ?? 0,
  };
}

export async function findNextTopic(
  userId: string,
  excludeTopicId: string,
): Promise<string | null> {
  const allProgress = await getAllTopicsProgress(userId);
  const next = allProgress.find(
    (p) => p.topicId !== excludeTopicId && p.dueToday > 0,
  );
  return next?.topicId ?? null;
}
