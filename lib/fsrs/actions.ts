"use server";

import type { Grade } from "ts-fsrs";
import { createNewCard, fromCard, toCard } from "@/lib/fsrs/card-mapper";
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
    const { data: updated } = await supabase
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
    cardStateId = updated!.id;
  } else {
    const { data: inserted } = await supabase
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
    cardStateId = inserted!.id;
  }

  // Insert review log
  await supabase.from("review_logs").insert({
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

  return { cardStateId, newState: dbFields };
}
