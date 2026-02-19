"use server";

import { createClient } from "@/lib/supabase/server";
import { getFlashcardIdsForTopic } from "@/lib/topics/topic-flashcard-ids";

export interface DailyStats {
  reviewsToday: number;
  newCardsToday: number;
  correctRate: number | null;
  avgAnswerTimeMs: number | null;
  dueTomorrow: number;
}

const EMPTY_STATS: DailyStats = {
  reviewsToday: 0,
  newCardsToday: 0,
  correctRate: null,
  avgAnswerTimeMs: null,
  dueTomorrow: 0,
};

export async function getDailyStats(
  userId: string,
  topicId: string,
): Promise<DailyStats> {
  const supabase = await createClient();

  const flashcardIds = await getFlashcardIdsForTopic(supabase, topicId);
  if (!flashcardIds.length) return EMPTY_STATS;

  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const tomorrowMidnight = new Date(todayMidnight);
  tomorrowMidnight.setUTCDate(tomorrowMidnight.getUTCDate() + 1);
  const dayAfter = new Date(tomorrowMidnight);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

  // Fetch today's review logs and due-tomorrow cards in parallel
  const [{ data: todayLogs }, { data: dueTomorrowCards }] = await Promise.all([
    supabase
      .from("review_logs")
      .select("rating, answer_time_ms, stability_before")
      .eq("user_id", userId)
      .in("flashcard_id", flashcardIds)
      .gte("reviewed_at", todayMidnight.toISOString()),
    supabase
      .from("user_card_state")
      .select("id")
      .eq("user_id", userId)
      .in("flashcard_id", flashcardIds)
      .gte("due", tomorrowMidnight.toISOString())
      .lt("due", dayAfter.toISOString()),
  ]);

  const logs = todayLogs || [];
  const reviewsToday = logs.length;

  if (reviewsToday === 0) {
    return {
      reviewsToday: 0,
      newCardsToday: 0,
      correctRate: null,
      avgAnswerTimeMs: null,
      dueTomorrow: dueTomorrowCards?.length ?? 0,
    };
  }

  const newCardsToday = logs.filter((l) => l.stability_before === null).length;
  const correctCount = logs.filter(
    (l) => l.rating === 3 || l.rating === 4,
  ).length;
  const correctRate = correctCount / reviewsToday;

  const timeLogs = logs.filter(
    (l) => l.answer_time_ms !== null && l.answer_time_ms > 0,
  );
  const avgAnswerTimeMs =
    timeLogs.length > 0
      ? timeLogs.reduce((sum, l) => sum + l.answer_time_ms!, 0) /
        timeLogs.length
      : null;

  return {
    reviewsToday,
    newCardsToday,
    correctRate,
    avgAnswerTimeMs,
    dueTomorrow: dueTomorrowCards?.length ?? 0,
  };
}
