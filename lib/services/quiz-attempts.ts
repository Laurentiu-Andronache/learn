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
  themeId: string,
  data: QuizAttemptData,
) {
  const supabase = await createClient();
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: userId,
      theme_id: themeId,
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
  themeId: string,
  limit = 10,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("theme_id", themeId)
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

export async function getLatestQuizAttempt(userId: string, themeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("theme_id", themeId)
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
