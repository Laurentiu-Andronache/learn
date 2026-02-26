"use server";

import { requireUserId } from "@/lib/supabase/server";

export interface QuizAttemptData {
  score: number;
  total: number;
  answers: Array<{
    question_id: string;
    selected_index: number | null;
    was_correct: boolean;
    time_ms: number;
  }>;
}

export async function saveQuizAttempt(topicId: string, data: QuizAttemptData) {
  const { supabase, userId } = await requireUserId();
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: userId,
      topic_id: topicId,
      score: data.score,
      total: data.total,
      answers: data.answers,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return attempt;
}

export async function getQuizAttempts(topicId: string, limit = 10) {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getLatestQuizAttempt(topicId: string) {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export interface QuizSummary {
  attemptCount: number;
  uniqueCorrectCount: number;
}

/** Collect unique correct question IDs from a list of attempts. */
function collectCorrectIds(
  attempts: Awaited<ReturnType<typeof getQuizAttempts>>,
): Set<string> {
  const correctIds = new Set<string>();
  for (const attempt of attempts) {
    const answers = attempt.answers as Array<{
      question_id: string;
      was_correct: boolean;
    }> | null;
    if (!answers) continue;
    for (const a of answers) {
      if (a.was_correct) correctIds.add(a.question_id);
    }
  }
  return correctIds;
}

/** Returns IDs of questions correctly answered in ANY attempt */
export async function getCorrectQuestionIds(
  topicId: string,
): Promise<string[]> {
  const attempts = await getQuizAttempts(topicId, 100);
  return [...collectCorrectIds(attempts)];
}

/** Returns { attemptCount, uniqueCorrectCount } across all attempts */
export async function getQuizSummary(topicId: string): Promise<QuizSummary> {
  const attempts = await getQuizAttempts(topicId, 100);
  return {
    attemptCount: attempts.length,
    uniqueCorrectCount: collectCorrectIds(attempts).size,
  };
}
