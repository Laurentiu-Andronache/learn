"use server";

import { after } from "next/server";
import type { Grade } from "ts-fsrs";
import { maybeAutoOptimize } from "@/lib/fsrs/auto-optimizer";
import { createNewCard, fromCard, toCard } from "@/lib/fsrs/card-mapper";
import { getAllTopicsProgress } from "@/lib/fsrs/progress";
import { createUserScheduler, Rating } from "@/lib/fsrs/scheduler";
import {
  captureSnapshot,
  insertReviewLog,
  restoreFromSnapshot,
  SNAPSHOT_SELECT,
} from "@/lib/fsrs/snapshot";
import { getFsrsSettings } from "@/lib/services/user-preferences";
import { requireUserId } from "@/lib/supabase/server";
import { getFlashcardIdsForTopic } from "@/lib/topics/topic-flashcard-ids";

export async function scheduleFlashcardReview(
  flashcardId: string,
  rating: 1 | 2 | 3 | 4,
  answerTimeMs?: number,
) {
  const { supabase, userId } = await requireUserId();

  // Fetch current card state + user FSRS settings in parallel
  const [{ data: existingState }, userSettings] = await Promise.all([
    supabase
      .from("user_card_state")
      .select("*")
      .eq("user_id", userId)
      .eq("flashcard_id", flashcardId)
      .single(),
    getFsrsSettings(),
  ]);

  const now = new Date();
  const card = existingState ? toCard(existingState) : createNewCard();

  const snapshot = captureSnapshot(existingState);

  // Run FSRS scheduling with per-user scheduler (including custom weights if optimized)
  const scheduler = createUserScheduler({
    desired_retention: userSettings.desired_retention,
    max_review_interval: userSettings.max_review_interval,
    fsrs_weights: userSettings.fsrs_weights,
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

  // Fire-and-forget auto-optimization check (runs after response sent)
  after(() => maybeAutoOptimize(userId));

  return { cardStateId, newState: dbFields };
}

export async function buryFlashcard(flashcardId: string) {
  const { supabase, userId } = await requireUserId();

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

export async function undoLastReview(flashcardId: string) {
  const { supabase, userId } = await requireUserId();

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

export async function resetTodayProgress(topicId: string): Promise<number> {
  const { supabase, userId } = await requireUserId();
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
  topicId: string,
): Promise<{ reviewLogs: number; cardStates: number; suspended: number }> {
  const { supabase, userId } = await requireUserId();
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
  excludeTopicId: string,
): Promise<string | null> {
  const { userId } = await requireUserId();
  const allProgress = await getAllTopicsProgress(userId);
  const next = allProgress.find(
    (p) => p.topicId !== excludeTopicId && p.dueToday > 0,
  );
  return next?.topicId ?? null;
}
