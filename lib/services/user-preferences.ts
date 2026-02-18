"use server";

import { createClient } from "@/lib/supabase/server";
import { getFlashcardIdsForTopic } from "@/lib/topics/topic-flashcard-ids";

// ============ SUSPENDED FLASHCARDS ============

export async function suspendFlashcard(
  userId: string,
  flashcardId: string,
  reason?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("suspended_flashcards").upsert(
    {
      user_id: userId,
      flashcard_id: flashcardId,
      reason: reason || null,
    },
    { onConflict: "user_id,flashcard_id" },
  );
  if (error) throw new Error(error.message);
}

export async function unsuspendFlashcard(userId: string, flashcardId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("suspended_flashcards")
    .delete()
    .eq("user_id", userId)
    .eq("flashcard_id", flashcardId);
  if (error) throw new Error(error.message);
}

export interface SuspendedFlashcardDetail {
  id: string;
  reason: string | null;
  suspended_at: string;
  flashcard: {
    id: string;
    question_en: string;
    question_es: string;
    category: { name_en: string; name_es: string } | null;
  } | null;
}

export async function getSuspendedFlashcards(
  userId: string,
): Promise<SuspendedFlashcardDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suspended_flashcards")
    .select(`
      id,
      reason,
      suspended_at,
      flashcard:flashcards(id, question_en, question_es, category:categories(name_en, name_es))
    `)
    .eq("user_id", userId)
    .order("suspended_at", { ascending: false })
    .returns<SuspendedFlashcardDetail[]>();
  if (error) throw new Error(error.message);
  return data || [];
}

export async function unsuspendAllFlashcardsForTopic(
  userId: string,
  topicId: string,
): Promise<number> {
  const supabase = await createClient();
  const flashcardIds = await getFlashcardIdsForTopic(supabase, topicId);
  if (!flashcardIds.length) return 0;
  const { data: deleted } = await supabase
    .from("suspended_flashcards")
    .delete()
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds)
    .select("id");
  return deleted?.length ?? 0;
}

// ============ HIDDEN TOPICS ============

export async function hideTopic(userId: string, topicId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("hidden_topics").upsert(
    {
      user_id: userId,
      topic_id: topicId,
    },
    { onConflict: "user_id,topic_id" },
  );
  if (error) throw new Error(error.message);
}

export async function unhideTopic(userId: string, topicId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("hidden_topics")
    .delete()
    .eq("user_id", userId)
    .eq("topic_id", topicId);
  if (error) throw new Error(error.message);
}

export interface HiddenTopicDetail {
  id: string;
  hidden_at: string;
  topic: {
    id: string;
    title_en: string;
    title_es: string;
    icon: string | null;
    color: string | null;
  } | null;
}

export async function getHiddenTopics(
  userId: string,
): Promise<HiddenTopicDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hidden_topics")
    .select(`
      id,
      hidden_at,
      topic:topics(id, title_en, title_es, icon, color)
    `)
    .eq("user_id", userId)
    .order("hidden_at", { ascending: false })
    .returns<HiddenTopicDetail[]>();
  if (error) throw new Error(error.message);
  return data || [];
}

// ============ READING PROGRESS ============

export async function updateReadingProgress(
  userId: string,
  topicId: string,
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
    .eq("topic_id", topicId);
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
      topic_id: topicId,
      category_id: categoryId,
      current_section: currentSection,
      completion_percent: completionPercent,
      last_read_at: now,
    });
    if (error) throw new Error(error.message);
  }
}

export interface ReadingProgressDetail {
  category_id: string;
  current_section: number;
  completion_percent: number;
}

export async function getReadingProgress(
  userId: string,
  topicId: string,
): Promise<ReadingProgressDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("topic_id", topicId);
  if (error) throw new Error(error.message);
  return data || [];
}

// ============ FSRS SETTINGS ============

export interface FsrsSettings {
  desired_retention: number;
  max_review_interval: number;
  new_cards_per_day: number;
  new_cards_ramp_up: boolean;
  show_review_time: boolean;
  read_questions_aloud: boolean;
  fsrs_weights: number[] | null;
  fsrs_weights_updated_at: string | null;
}

const FSRS_DEFAULTS: FsrsSettings = {
  desired_retention: 0.9,
  max_review_interval: 36500,
  new_cards_per_day: 10,
  new_cards_ramp_up: true,
  show_review_time: true,
  read_questions_aloud: false,
  fsrs_weights: null,
  fsrs_weights_updated_at: null,
};

export async function getFsrsSettings(userId: string): Promise<FsrsSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "desired_retention, max_review_interval, new_cards_per_day, new_cards_ramp_up, show_review_time, read_questions_aloud, fsrs_weights, fsrs_weights_updated_at",
    )
    .eq("id", userId)
    .single();
  if (error || !data) return { ...FSRS_DEFAULTS };
  return {
    desired_retention:
      data.desired_retention ?? FSRS_DEFAULTS.desired_retention,
    max_review_interval:
      data.max_review_interval ?? FSRS_DEFAULTS.max_review_interval,
    new_cards_per_day:
      data.new_cards_per_day ?? FSRS_DEFAULTS.new_cards_per_day,
    new_cards_ramp_up:
      data.new_cards_ramp_up ?? FSRS_DEFAULTS.new_cards_ramp_up,
    show_review_time: data.show_review_time ?? FSRS_DEFAULTS.show_review_time,
    read_questions_aloud:
      data.read_questions_aloud ?? FSRS_DEFAULTS.read_questions_aloud,
    fsrs_weights: (data.fsrs_weights as number[] | null) ?? null,
    fsrs_weights_updated_at: data.fsrs_weights_updated_at ?? null,
  };
}

export async function updateFsrsSettings(
  userId: string,
  settings: Partial<FsrsSettings>,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

// ============ BASE FONT SIZE ============

export async function getBaseFontSize(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("base_font_size")
    .eq("id", userId)
    .single();
  if (error || !data) return 14;
  return data.base_font_size ?? 14;
}

export async function updateBaseFontSize(
  userId: string,
  size: number,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ base_font_size: size, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
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
