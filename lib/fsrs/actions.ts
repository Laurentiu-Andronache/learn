"use server";

import type { Grade } from "ts-fsrs";
import { createNewCard, fromCard, toCard } from "@/lib/fsrs/card-mapper";
import { getAllTopicsProgress } from "@/lib/fsrs/progress";
import { createUserScheduler, Rating } from "@/lib/fsrs/scheduler";
import { getFsrsSettings } from "@/lib/services/user-preferences";
import { createClient } from "@/lib/supabase/server";
import { getFlashcardIdsForTopic } from "@/lib/topics/topic-flashcard-ids";

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

  // Capture full before-snapshot for undo support
  const stabilityBefore = existingState ? existingState.stability : null;
  const difficultyBefore = existingState ? existingState.difficulty : null;
  const stateBefore = existingState ? existingState.state : null;
  const repsBefore = existingState ? existingState.reps : null;
  const lapsesBefore = existingState ? existingState.lapses : null;
  const elapsedDaysBefore = existingState ? existingState.elapsed_days : null;
  const scheduledDaysBefore = existingState
    ? existingState.scheduled_days
    : null;
  const lastReviewBefore = existingState ? existingState.last_review : null;
  const dueBefore = existingState ? existingState.due : null;
  const learningStepsBefore = existingState
    ? existingState.learning_steps ?? 0
    : null;

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

  // Insert review log with full before-snapshot
  const { error: logError } = await supabase.from("review_logs").insert({
    user_id: userId,
    flashcard_id: flashcardId,
    card_state_id: cardStateId,
    rating,
    answer_time_ms: answerTimeMs ?? null,
    stability_before: stabilityBefore,
    difficulty_before: difficultyBefore,
    state_before: stateBefore,
    reps_before: repsBefore,
    lapses_before: lapsesBefore,
    elapsed_days_before: elapsedDaysBefore,
    scheduled_days_before: scheduledDaysBefore,
    last_review_before: lastReviewBefore,
    due_before: dueBefore,
    learning_steps_before: learningStepsBefore,
  });
  if (logError) {
    console.error("Failed to insert review log:", logError.message);
  }

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

  // Find the most recent review log with full snapshot
  const { data: lastLog } = await supabase
    .from("review_logs")
    .select(
      "id, stability_before, difficulty_before, state_before, reps_before, lapses_before, elapsed_days_before, scheduled_days_before, last_review_before, due_before, learning_steps_before",
    )
    .eq("user_id", userId)
    .eq("flashcard_id", flashcardId)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastLog) return;

  // Delete the review log
  await supabase.from("review_logs").delete().eq("id", lastLog.id);

  if (lastLog.state_before === null) {
    // Card was new before this review — delete card state entirely
    await supabase
      .from("user_card_state")
      .delete()
      .eq("user_id", userId)
      .eq("flashcard_id", flashcardId);
  } else {
    // Restore card state from snapshot
    await supabase
      .from("user_card_state")
      .update({
        stability: lastLog.stability_before,
        difficulty: lastLog.difficulty_before,
        state: lastLog.state_before,
        reps: lastLog.reps_before,
        lapses: lastLog.lapses_before,
        elapsed_days: lastLog.elapsed_days_before,
        scheduled_days: lastLog.scheduled_days_before,
        last_review: lastLog.last_review_before,
        due: lastLog.due_before,
        learning_steps: lastLog.learning_steps_before ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("flashcard_id", flashcardId);
  }
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

  // Fetch today's review logs with full snapshot data
  const { data: todayLogs } = await supabase
    .from("review_logs")
    .select(
      "id, flashcard_id, state_before, stability_before, difficulty_before, reps_before, lapses_before, elapsed_days_before, scheduled_days_before, last_review_before, due_before, learning_steps_before",
    )
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds)
    .gte("reviewed_at", todayMidnight.toISOString())
    .order("reviewed_at", { ascending: true });

  if (!todayLogs?.length) return 0;

  // Group by flashcard_id — first log today has the pre-today snapshot
  const firstLogByFlashcard = new Map<
    string,
    (typeof todayLogs)[0]
  >();
  for (const log of todayLogs) {
    if (!firstLogByFlashcard.has(log.flashcard_id)) {
      firstLogByFlashcard.set(log.flashcard_id, log);
    }
  }

  // Bulk delete today's review logs
  const logIds = todayLogs.map((l) => l.id);
  await supabase.from("review_logs").delete().in("id", logIds);

  // Restore each flashcard's card state to its pre-today state using snapshot
  for (const [flashcardId, firstLog] of firstLogByFlashcard) {
    if (firstLog.state_before === null) {
      // Card was new today — delete card state entirely
      await supabase
        .from("user_card_state")
        .delete()
        .eq("user_id", userId)
        .eq("flashcard_id", flashcardId);
    } else {
      // Restore from first log's before-snapshot
      await supabase
        .from("user_card_state")
        .update({
          stability: firstLog.stability_before,
          difficulty: firstLog.difficulty_before,
          state: firstLog.state_before,
          reps: firstLog.reps_before,
          lapses: firstLog.lapses_before,
          elapsed_days: firstLog.elapsed_days_before,
          scheduled_days: firstLog.scheduled_days_before,
          last_review: firstLog.last_review_before,
          due: firstLog.due_before,
          learning_steps: firstLog.learning_steps_before ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("flashcard_id", flashcardId);
    }
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
