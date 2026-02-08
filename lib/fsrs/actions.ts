"use server";

import type { Grade } from "ts-fsrs";
import { createNewCard, fromCard, toCard } from "@/lib/fsrs/card-mapper";
import { getAllTopicsProgress } from "@/lib/fsrs/progress";
import { fsrs, Rating } from "@/lib/fsrs/scheduler";
import { createClient } from "@/lib/supabase/server";

export async function scheduleReview(
  userId: string,
  questionId: string,
  rating: 1 | 2 | 3 | 4,
  mode: "quiz" | "flashcard",
  wasCorrect: boolean | null,
  answerTimeMs: number | null,
) {
  const supabase = await createClient();

  // Fetch current card state
  const { data: existingState } = await supabase
    .from("user_card_state")
    .select("*")
    .eq("user_id", userId)
    .eq("question_id", questionId)
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
  const isIdk = rating === Rating.Again && wasCorrect === null;
  const timesCorrectInc = wasCorrect === true ? 1 : 0;
  const timesIncorrectInc = wasCorrect === false ? 1 : 0;
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
      throw new Error(`Failed to update card state: ${updateError?.message ?? "no data returned"}`);
    }
    cardStateId = updated.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("user_card_state")
      .insert({
        user_id: userId,
        question_id: questionId,
        ...dbFields,
        times_correct: timesCorrectInc,
        times_incorrect: timesIncorrectInc,
        times_idk: timesIdkInc,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      throw new Error(`Failed to insert card state: ${insertError?.message ?? "no data returned"}`);
    }
    cardStateId = inserted.id;
  }

  // Insert review log
  const { error: logError } = await supabase.from("review_logs").insert({
    user_id: userId,
    question_id: questionId,
    card_state_id: cardStateId,
    rating,
    mode,
    answer_time_ms: answerTimeMs,
    was_correct: wasCorrect,
    stability_before: stabilityBefore,
    difficulty_before: difficultyBefore,
  });
  if (logError) {
    console.error("Failed to insert review log:", logError.message);
  }

  return { cardStateId, newState: dbFields };
}

export async function buryCard(userId: string, questionId: string) {
  const supabase = await createClient();

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const dueStr = tomorrow.toISOString();

  const { data: existing } = await supabase
    .from("user_card_state")
    .select("id")
    .eq("user_id", userId)
    .eq("question_id", questionId)
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
      question_id: questionId,
      ...dbFields,
      due: dueStr,
    });
    if (error) throw new Error(`Failed to bury card: ${error.message}`);
  }
}

export async function undoLastReview(userId: string, questionId: string) {
  const supabase = await createClient();

  // Find the most recent review log
  const { data: lastLog } = await supabase
    .from("review_logs")
    .select("id, stability_before, difficulty_before")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastLog) return;

  // Delete the review log
  await supabase.from("review_logs").delete().eq("id", lastLog.id);

  // Restore or delete card state
  if (lastLog.stability_before === null || lastLog.difficulty_before === null) {
    // Card was newly created — remove it entirely
    await supabase
      .from("user_card_state")
      .delete()
      .eq("user_id", userId)
      .eq("question_id", questionId);
  } else {
    // Find the previous review log to restore full state
    const { data: prevLog } = await supabase
      .from("review_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (prevLog) {
      // Reconstruct card state from the previous review's outcome
      // Use stability_before/difficulty_before from the now-latest log
      // as those represent what the card looked like BEFORE that review
      await supabase
        .from("user_card_state")
        .update({
          stability: lastLog.stability_before,
          difficulty: lastLog.difficulty_before,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("question_id", questionId);
    } else {
      // No more review logs — remove card state
      await supabase
        .from("user_card_state")
        .delete()
        .eq("user_id", userId)
        .eq("question_id", questionId);
    }
  }
}

async function getQuestionIdsForTheme(
  supabase: Awaited<ReturnType<typeof createClient>>,
  themeId: string,
): Promise<string[]> {
  const { data: cats } = await supabase
    .from("categories")
    .select("id")
    .eq("theme_id", themeId);
  if (!cats?.length) return [];
  const catIds = cats.map((c) => c.id);
  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .in("category_id", catIds);
  return questions?.map((q) => q.id) ?? [];
}

export async function resetTodayProgress(
  userId: string,
  themeId: string,
): Promise<number> {
  const supabase = await createClient();
  const questionIds = await getQuestionIdsForTheme(supabase, themeId);
  if (!questionIds.length) return 0;

  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);

  // Fetch today's review logs for this topic's questions
  const { data: todayLogs } = await supabase
    .from("review_logs")
    .select("id, question_id, stability_before, difficulty_before, created_at")
    .eq("user_id", userId)
    .in("question_id", questionIds)
    .gte("created_at", todayMidnight.toISOString())
    .order("created_at", { ascending: true });

  if (!todayLogs?.length) return 0;

  // Group by question_id — first log today tells us the "before" state
  const firstLogByQuestion = new Map<
    string,
    { stability_before: number | null; difficulty_before: number | null }
  >();
  for (const log of todayLogs) {
    if (!firstLogByQuestion.has(log.question_id)) {
      firstLogByQuestion.set(log.question_id, {
        stability_before: log.stability_before,
        difficulty_before: log.difficulty_before,
      });
    }
  }

  // Restore each question's card state to its pre-today state
  for (const [questionId, before] of firstLogByQuestion) {
    if (before.stability_before === null) {
      // Card was new today → delete card state entirely
      await supabase
        .from("user_card_state")
        .delete()
        .eq("user_id", userId)
        .eq("question_id", questionId);
    } else {
      // Restore to pre-today values
      await supabase
        .from("user_card_state")
        .update({
          stability: before.stability_before,
          difficulty: before.difficulty_before,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("question_id", questionId);
    }
  }

  // Bulk delete today's review logs
  const logIds = todayLogs.map((l) => l.id);
  await supabase.from("review_logs").delete().in("id", logIds);

  return todayLogs.length;
}

export async function resetAllProgress(
  userId: string,
  themeId: string,
): Promise<{ reviewLogs: number; cardStates: number; suspended: number }> {
  const supabase = await createClient();
  const questionIds = await getQuestionIdsForTheme(supabase, themeId);
  if (!questionIds.length) return { reviewLogs: 0, cardStates: 0, suspended: 0 };

  // Delete review logs first
  const { data: deletedLogs } = await supabase
    .from("review_logs")
    .delete()
    .eq("user_id", userId)
    .in("question_id", questionIds)
    .select("id");

  // Delete card states
  const { data: deletedStates } = await supabase
    .from("user_card_state")
    .delete()
    .eq("user_id", userId)
    .in("question_id", questionIds)
    .select("id");

  // Delete suspended questions
  const { data: deletedSuspended } = await supabase
    .from("suspended_questions")
    .delete()
    .eq("user_id", userId)
    .in("question_id", questionIds)
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
