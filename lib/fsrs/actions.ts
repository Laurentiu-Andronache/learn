"use server";

import type { Grade } from "ts-fsrs";
import { createNewCard, fromCard, toCard } from "@/lib/fsrs/card-mapper";
import { getAllTopicsProgress } from "@/lib/fsrs/progress";
import { fsrs, Rating } from "@/lib/fsrs/scheduler";
import { createClient } from "@/lib/supabase/server";

export async function scheduleFlashcardReview(
  userId: string,
  flashcardId: string,
  rating: 1 | 2 | 3 | 4,
  answerTimeMs?: number,
) {
  const supabase = await createClient();

  // Fetch current card state
  const { data: existingState } = await supabase
    .from("user_card_state")
    .select("*")
    .eq("user_id", userId)
    .eq("flashcard_id", flashcardId)
    .single();

  const now = new Date();
  const card = existingState ? toCard(existingState) : createNewCard();

  // Save before state for logging
  const stabilityBefore = card.stability;
  const difficultyBefore = card.difficulty;

  // Run FSRS scheduling — repeat() returns all 4 outcomes, pick by rating
  const scheduled = fsrs.repeat(card, now);
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

  // Insert review log
  const { error: logError } = await supabase.from("review_logs").insert({
    user_id: userId,
    flashcard_id: flashcardId,
    card_state_id: cardStateId,
    rating,
    answer_time_ms: answerTimeMs ?? null,
    stability_before: stabilityBefore,
    difficulty_before: difficultyBefore,
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

  // Find the most recent review log
  const { data: lastLog } = await supabase
    .from("review_logs")
    .select("id, stability_before, difficulty_before")
    .eq("user_id", userId)
    .eq("flashcard_id", flashcardId)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastLog) return;

  // Get current card state before deleting the log (for full restore)
  const { data: currentCardState } = await supabase
    .from("user_card_state")
    .select("*")
    .eq("user_id", userId)
    .eq("flashcard_id", flashcardId)
    .single();

  // Delete the review log
  await supabase.from("review_logs").delete().eq("id", lastLog.id);

  // Check if there's a previous review log remaining
  const { data: prevLog } = await supabase
    .from("review_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("flashcard_id", flashcardId)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .single();

  if (!prevLog) {
    // No more review logs — card was new before this review, delete state entirely
    await supabase
      .from("user_card_state")
      .delete()
      .eq("user_id", userId)
      .eq("flashcard_id", flashcardId);
  } else if (currentCardState) {
    // Restore full card state from the "before" snapshot stored in the deleted log.
    // The stability_before/difficulty_before tell us what the card looked like BEFORE
    // the review we just deleted. We need to reconstruct the full state by re-scheduling
    // from the previous review's outcome. The simplest correct approach: replay FSRS
    // from the previous log's snapshot. But we don't store full card state in logs,
    // so we restore stability/difficulty from the deleted log's "before" values and
    // replay the previous review to get the rest of the fields.
    //
    // Better approach: the previous review log's stability_before/difficulty_before
    // represent what the card was BEFORE that review. So after that review, the card
    // should have the values that were the "before" of the review we just deleted.
    // We restore: stability = lastLog.stability_before, difficulty = lastLog.difficulty_before,
    // and for the scheduling fields (state, due, reps, lapses, elapsed_days, scheduled_days, last_review),
    // we need the card state as it was AFTER the previous review. Since the "before" values
    // of the deleted log ARE the "after" values of the previous review, and we only store
    // stability_before/difficulty_before, we need to reconstruct the rest.
    //
    // The most reliable approach: use the previous log to re-derive the card state.
    // Since we can't perfectly reconstruct without full snapshots, we use a simpler
    // but correct approach for the fields we DO have:
    if (
      lastLog.stability_before === null ||
      lastLog.difficulty_before === null
    ) {
      // The card was brand new before this review — delete state entirely
      await supabase
        .from("user_card_state")
        .delete()
        .eq("user_id", userId)
        .eq("flashcard_id", flashcardId);
    } else {
      // Restore stability and difficulty from the deleted log's "before" values.
      // For the remaining fields, we reconstruct by replaying the previous review.
      // Get the card state that existed before the previous review (from prevLog's before values),
      // then replay prevLog's rating to get the full after-state.
      const prevStabilityBefore = prevLog.stability_before;
      const prevDifficultyBefore = prevLog.difficulty_before;

      let restoredFields: ReturnType<typeof fromCard>;
      if (prevStabilityBefore === null || prevDifficultyBefore === null) {
        // The previous review was on a new card — replay from empty card
        const emptyCard = createNewCard();
        const prevReviewDate = new Date(prevLog.reviewed_at);
        const prevScheduled = fsrs.repeat(emptyCard, prevReviewDate);
        const afterPrevCard = prevScheduled[prevLog.rating as Grade].card;
        restoredFields = fromCard(afterPrevCard);
      } else {
        // Build a partial card from the previous log's "before" snapshot,
        // then replay that review
        const cardBeforePrev = toCard({
          stability: prevStabilityBefore,
          difficulty: prevDifficultyBefore,
          // Use reasonable defaults for fields not in the snapshot
          elapsed_days: 0,
          scheduled_days: 0,
          reps: Math.max(0, currentCardState.reps - 1),
          lapses: currentCardState.lapses,
          state: "review",
          last_review: null,
          due: prevLog.reviewed_at,
        });
        const prevReviewDate = new Date(prevLog.reviewed_at);
        const prevScheduled = fsrs.repeat(cardBeforePrev, prevReviewDate);
        const afterPrevCard = prevScheduled[prevLog.rating as Grade].card;
        restoredFields = fromCard(afterPrevCard);
      }

      await supabase
        .from("user_card_state")
        .update({
          ...restoredFields,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("flashcard_id", flashcardId);
    }
  }
}

async function getFlashcardIdsForTheme(
  supabase: Awaited<ReturnType<typeof createClient>>,
  themeId: string,
): Promise<string[]> {
  const { data: cats } = await supabase
    .from("categories")
    .select("id")
    .eq("theme_id", themeId);
  if (!cats?.length) return [];
  const catIds = cats.map((c) => c.id);
  const { data: flashcards } = await supabase
    .from("flashcards")
    .select("id")
    .in("category_id", catIds);
  return flashcards?.map((f) => f.id) ?? [];
}

export async function resetTodayProgress(
  userId: string,
  themeId: string,
): Promise<number> {
  const supabase = await createClient();
  const flashcardIds = await getFlashcardIdsForTheme(supabase, themeId);
  if (!flashcardIds.length) return 0;

  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);

  // Fetch today's review logs for this topic's flashcards
  const { data: todayLogs } = await supabase
    .from("review_logs")
    .select(
      "id, flashcard_id, stability_before, difficulty_before, rating, reviewed_at",
    )
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds)
    .gte("reviewed_at", todayMidnight.toISOString())
    .order("reviewed_at", { ascending: true });

  if (!todayLogs?.length) return 0;

  // Group by flashcard_id — first log today tells us the "before" state
  const firstLogByFlashcard = new Map<
    string,
    { stability_before: number | null; difficulty_before: number | null }
  >();
  for (const log of todayLogs) {
    if (!firstLogByFlashcard.has(log.flashcard_id)) {
      firstLogByFlashcard.set(log.flashcard_id, {
        stability_before: log.stability_before,
        difficulty_before: log.difficulty_before,
      });
    }
  }

  // Bulk delete today's review logs first
  const logIds = todayLogs.map((l) => l.id);
  await supabase.from("review_logs").delete().in("id", logIds);

  // Restore each flashcard's card state to its pre-today state
  for (const [flashcardId, before] of firstLogByFlashcard) {
    if (before.stability_before === null || before.difficulty_before === null) {
      // Card was new today -> delete card state entirely
      await supabase
        .from("user_card_state")
        .delete()
        .eq("user_id", userId)
        .eq("flashcard_id", flashcardId);
    } else {
      // Find the most recent remaining review log (pre-today) to reconstruct full state
      const { data: prevLog } = await supabase
        .from("review_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("flashcard_id", flashcardId)
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .single();

      if (!prevLog) {
        // No prior logs remain — delete card state
        await supabase
          .from("user_card_state")
          .delete()
          .eq("user_id", userId)
          .eq("flashcard_id", flashcardId);
      } else {
        // Replay the previous review to reconstruct the full card state after it
        const prevStabBefore = prevLog.stability_before;
        const prevDiffBefore = prevLog.difficulty_before;
        let restoredFields: ReturnType<typeof fromCard>;

        if (prevStabBefore === null || prevDiffBefore === null) {
          // Previous review was on a new card
          const emptyCard = createNewCard();
          const prevDate = new Date(prevLog.reviewed_at);
          const prevScheduled = fsrs.repeat(emptyCard, prevDate);
          const afterPrevCard = prevScheduled[prevLog.rating as Grade].card;
          restoredFields = fromCard(afterPrevCard);
        } else {
          const cardBeforePrev = toCard({
            stability: prevStabBefore,
            difficulty: prevDiffBefore,
            elapsed_days: 0,
            scheduled_days: 0,
            reps: 0,
            lapses: 0,
            state: "review",
            last_review: null,
            due: prevLog.reviewed_at,
          });
          const prevDate = new Date(prevLog.reviewed_at);
          const prevScheduled = fsrs.repeat(cardBeforePrev, prevDate);
          const afterPrevCard = prevScheduled[prevLog.rating as Grade].card;
          restoredFields = fromCard(afterPrevCard);
        }

        await supabase
          .from("user_card_state")
          .update({
            ...restoredFields,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("flashcard_id", flashcardId);
      }
    }
  }

  return todayLogs.length;
}

export async function resetAllProgress(
  userId: string,
  themeId: string,
): Promise<{ reviewLogs: number; cardStates: number; suspended: number }> {
  const supabase = await createClient();
  const flashcardIds = await getFlashcardIdsForTheme(supabase, themeId);
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
  excludeThemeId: string,
): Promise<string | null> {
  const allProgress = await getAllTopicsProgress(userId);
  const next = allProgress.find(
    (p) => p.topicId !== excludeThemeId && p.dueToday > 0,
  );
  return next?.topicId ?? null;
}
