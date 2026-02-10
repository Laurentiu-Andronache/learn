"use server";

import { createClient } from "@/lib/supabase/server";

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

export async function saveQuizAttempt(
  userId: string,
  topicId: string,
  data: QuizAttemptData,
) {
  const supabase = await createClient();
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
  // Gracefully handle missing table (quiz_attempts may not be migrated yet)
  if (error) {
    if (error.message.includes("schema cache") || error.code === "PGRST204") {
      return null;
    }
    throw new Error(error.message);
  }
  return attempt;
}

export async function getQuizAttempts(
  userId: string,
  topicId: string,
  limit = 10,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .order("completed_at", { ascending: false })
    .limit(limit);
  // Gracefully handle missing table (quiz_attempts may not be migrated yet)
  if (error) {
    if (error.message.includes("schema cache") || error.code === "PGRST204") {
      return [];
    }
    throw new Error(error.message);
  }
  return data || [];
}

export async function getLatestQuizAttempt(userId: string, topicId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Gracefully handle missing table (quiz_attempts may not be migrated yet)
  if (error) {
    if (error.message.includes("schema cache") || error.code === "PGRST204") {
      return null;
    }
    throw new Error(error.message);
  }
  return data;
}

export interface QuizSummary {
  attemptCount: number;
  uniqueCorrectCount: number;
}

/** Returns IDs of questions correctly answered in ANY attempt */
export async function getCorrectQuestionIds(
  userId: string,
  topicId: string,
): Promise<string[]> {
  const attempts = await getQuizAttempts(userId, topicId, 100);
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
  return [...correctIds];
}

/** Returns { attemptCount, uniqueCorrectCount } across all attempts */
export async function getQuizSummary(
  userId: string,
  topicId: string,
): Promise<QuizSummary> {
  const attempts = await getQuizAttempts(userId, topicId, 100);
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
  return { attemptCount: attempts.length, uniqueCorrectCount: correctIds.size };
}
