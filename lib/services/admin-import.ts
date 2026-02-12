"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ImportQuestion {
  type: string;
  question_en: string;
  question_es: string;
  options_en: string[] | null;
  options_es: string[] | null;
  correct_index: number | null;
  explanation_en: string | null;
  explanation_es: string | null;
  extra_en?: string | null;
  extra_es?: string | null;
  difficulty?: number;
}

export interface ImportFlashcard {
  question_en: string;
  question_es: string;
  answer_en: string;
  answer_es: string;
  extra_en?: string | null;
  extra_es?: string | null;
  difficulty?: number;
}

export interface ImportCategory {
  name_en: string;
  name_es: string;
  slug: string;
  color?: string | null;
  questions: ImportQuestion[];
  flashcards?: ImportFlashcard[];
}

export interface ImportTopic {
  title_en: string;
  title_es: string;
  description_en?: string | null;
  description_es?: string | null;
  icon?: string | null;
  color?: string | null;
  categories: ImportCategory[];
}

export interface ImportSummary {
  topicTitle: string;
  categoryCount: number;
  questionCount: number;
  flashcardCount: number;
  errors: string[];
}

export async function validateImportJson(
  json: unknown,
): Promise<ImportSummary> {
  const errors: string[] = [];
  const data = json as Record<string, unknown>;

  if (!data || typeof data !== "object") {
    return {
      topicTitle: "",
      categoryCount: 0,
      questionCount: 0,
      flashcardCount: 0,
      errors: ["Invalid JSON object"],
    };
  }

  const title = (data.title_en as string) || "(no title)";
  if (!data.title_en) errors.push("Missing title_en");
  if (!data.title_es) errors.push("Missing title_es");

  const cats = data.categories;
  if (!Array.isArray(cats) || cats.length === 0) {
    errors.push("Missing or empty categories array");
    return {
      topicTitle: title,
      categoryCount: 0,
      questionCount: 0,
      flashcardCount: 0,
      errors,
    };
  }

  let totalQuestions = 0;
  let totalFlashcards = 0;
  cats.forEach((cat, ci) => {
    if (!cat.name_en) errors.push(`Category ${ci}: missing name_en`);
    if (!cat.name_es) errors.push(`Category ${ci}: missing name_es`);
    if (!cat.slug) errors.push(`Category ${ci}: missing slug`);
    if (!Array.isArray(cat.questions)) {
      errors.push(`Category ${ci}: missing questions array`);
      return;
    }
    cat.questions.forEach((q: Record<string, unknown>, qi: number) => {
      if (!q.question_en) errors.push(`Cat ${ci} Q${qi}: missing question_en`);
      if (!q.question_es) errors.push(`Cat ${ci} Q${qi}: missing question_es`);
      if (!q.type) errors.push(`Cat ${ci} Q${qi}: missing type`);
      totalQuestions++;
    });
    if (Array.isArray(cat.flashcards)) {
      cat.flashcards.forEach((f: Record<string, unknown>, fi: number) => {
        if (!f.question_en)
          errors.push(`Cat ${ci} F${fi}: missing question_en`);
        if (!f.question_es)
          errors.push(`Cat ${ci} F${fi}: missing question_es`);
        if (!f.answer_en) errors.push(`Cat ${ci} F${fi}: missing answer_en`);
        if (!f.answer_es) errors.push(`Cat ${ci} F${fi}: missing answer_es`);
        totalFlashcards++;
      });
    }
  });

  return {
    topicTitle: title,
    categoryCount: cats.length,
    questionCount: totalQuestions,
    flashcardCount: totalFlashcards,
    errors,
  };
}

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function insertCategoryWithContent(
  supabase: AppSupabaseClient,
  cat: ImportCategory,
  topicId: string,
): Promise<{ questions: number; flashcards: number }> {
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .insert({
      topic_id: topicId,
      name_en: cat.name_en,
      name_es: cat.name_es,
      slug: cat.slug,
      color: cat.color || null,
    })
    .select("id")
    .single();

  if (catErr)
    throw new Error(
      `Category "${cat.name_en}" insert failed: ${catErr.message}`,
    );

  let questions = 0;
  if (cat.questions.length > 0) {
    const rows = cat.questions.map((q) => ({
      category_id: category.id,
      type: q.type,
      question_en: q.question_en,
      question_es: q.question_es,
      options_en: q.options_en,
      options_es: q.options_es,
      correct_index: q.correct_index,
      explanation_en: q.explanation_en || null,
      explanation_es: q.explanation_es || null,
      extra_en: q.extra_en || null,
      extra_es: q.extra_es || null,
      difficulty: q.difficulty ?? 5,
    }));

    const { error: qErr } = await supabase.from("questions").insert(rows);
    if (qErr)
      throw new Error(
        `Questions insert for "${cat.name_en}" failed: ${qErr.message}`,
      );
    questions = rows.length;
  }

  let flashcards = 0;
  if (cat.flashcards && cat.flashcards.length > 0) {
    const fRows = cat.flashcards.map((f) => ({
      category_id: category.id,
      question_en: f.question_en,
      question_es: f.question_es,
      answer_en: f.answer_en,
      answer_es: f.answer_es,
      extra_en: f.extra_en || null,
      extra_es: f.extra_es || null,
      difficulty: f.difficulty ?? 5,
    }));

    const { error: fErr } = await supabase.from("flashcards").insert(fRows);
    if (fErr)
      throw new Error(
        `Flashcards insert for "${cat.name_en}" failed: ${fErr.message}`,
      );
    flashcards = fRows.length;
  }

  return { questions, flashcards };
}

export async function importTopicJson(json: ImportTopic) {
  const supabase = await createClient();

  // Get current user for creator_id
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Insert topic
  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .insert({
      title_en: json.title_en,
      title_es: json.title_es,
      description_en: json.description_en || null,
      description_es: json.description_es || null,
      icon: json.icon || null,
      color: json.color || null,
      is_active: true,
      creator_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (topicErr) throw new Error(`Topic insert failed: ${topicErr.message}`);

  let totalQuestionsInserted = 0;
  let totalFlashcardsInserted = 0;

  for (const cat of json.categories) {
    const { questions, flashcards } = await insertCategoryWithContent(
      supabase,
      cat,
      topic.id,
    );
    totalQuestionsInserted += questions;
    totalFlashcardsInserted += flashcards;
  }

  revalidatePath("/admin/topics");
  revalidatePath("/admin/questions");
  revalidatePath("/admin/quizzes");
  revalidatePath("/admin/flashcards");
  return {
    topicId: topic.id,
    questionsInserted: totalQuestionsInserted,
    flashcardsInserted: totalFlashcardsInserted,
  };
}
