"use server";

import { createClient } from "@/lib/supabase/server";

export interface DailyStats {
  reviewsToday: number;
  newCardsToday: number;
  correctRate: number | null;
  avgAnswerTimeMs: number | null;
  dueTomorrow: number;
}

export async function getDailyStats(
  userId: string,
  themeId: string,
): Promise<DailyStats> {
  const supabase = await createClient();

  // Get flashcard IDs for this theme
  const { data: cats } = await supabase
    .from("categories")
    .select("id")
    .eq("theme_id", themeId);
  if (!cats?.length)
    return {
      reviewsToday: 0,
      newCardsToday: 0,
      correctRate: null,
      avgAnswerTimeMs: null,
      dueTomorrow: 0,
    };

  const { data: flashcards } = await supabase
    .from("flashcards")
    .select("id")
    .in(
      "category_id",
      cats.map((c) => c.id),
    );
  const flashcardIds = flashcards?.map((f) => f.id) ?? [];
  if (!flashcardIds.length)
    return {
      reviewsToday: 0,
      newCardsToday: 0,
      correctRate: null,
      avgAnswerTimeMs: null,
      dueTomorrow: 0,
    };

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
