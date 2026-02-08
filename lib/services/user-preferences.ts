"use server";

import { createClient } from "@/lib/supabase/server";

// ============ SUSPENDED QUESTIONS ============

export async function suspendQuestion(
  userId: string,
  questionId: string,
  reason?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("suspended_questions").upsert(
    {
      user_id: userId,
      question_id: questionId,
      reason: reason || null,
    },
    { onConflict: "user_id,question_id" },
  );
  if (error) throw new Error(error.message);
}

export async function unsuspendQuestion(userId: string, questionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("suspended_questions")
    .delete()
    .eq("user_id", userId)
    .eq("question_id", questionId);
  if (error) throw new Error(error.message);
}

export async function getSuspendedQuestions(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suspended_questions")
    .select(`
      id,
      reason,
      suspended_at,
      question:questions(id, question_en, question_es, category:categories(name_en, name_es))
    `)
    .eq("user_id", userId)
    .order("suspended_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ============ HIDDEN TOPICS ============

export async function hideTopic(userId: string, themeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("hidden_themes").upsert(
    {
      user_id: userId,
      theme_id: themeId,
    },
    { onConflict: "user_id,theme_id" },
  );
  if (error) throw new Error(error.message);
}

export async function unhideTopic(userId: string, themeId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("hidden_themes")
    .delete()
    .eq("user_id", userId)
    .eq("theme_id", themeId);
  if (error) throw new Error(error.message);
}

export async function getHiddenTopics(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hidden_themes")
    .select(`
      id,
      hidden_at,
      theme:themes(id, title_en, title_es, icon, color)
    `)
    .eq("user_id", userId)
    .order("hidden_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ============ READING PROGRESS ============

export async function updateReadingProgress(
  userId: string,
  themeId: string,
  categoryId: string | null,
  currentSection: number,
  completionPercent: number,
) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  // Check for existing row (NULL-safe category_id comparison)
  let query = supabase
    .from("reading_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("theme_id", themeId);
  query = categoryId
    ? query.eq("category_id", categoryId)
    : query.is("category_id", null);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("reading_progress")
      .update({
        current_section: currentSection,
        completion_percent: completionPercent,
        last_read_at: now,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("reading_progress").insert({
      user_id: userId,
      theme_id: themeId,
      category_id: categoryId,
      current_section: currentSection,
      completion_percent: completionPercent,
      last_read_at: now,
    });
    if (error) throw new Error(error.message);
  }
}

export async function getReadingProgress(userId: string, themeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("theme_id", themeId);
  if (error) throw new Error(error.message);
  return data || [];
}

// ============ PROFILE ============

export async function updateProfile(
  userId: string,
  updates: { display_name?: string; preferred_language?: "en" | "es" },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}
