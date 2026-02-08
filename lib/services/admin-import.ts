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

export interface ImportCategory {
  name_en: string;
  name_es: string;
  slug: string;
  color?: string | null;
  questions: ImportQuestion[];
}

export interface ImportTheme {
  title_en: string;
  title_es: string;
  description_en?: string | null;
  description_es?: string | null;
  icon?: string | null;
  color?: string | null;
  categories: ImportCategory[];
}

export interface ImportSummary {
  themeTitle: string;
  categoryCount: number;
  questionCount: number;
  errors: string[];
}

export async function validateImportJson(
  json: unknown,
): Promise<ImportSummary> {
  const errors: string[] = [];
  const data = json as Record<string, unknown>;

  if (!data || typeof data !== "object") {
    return {
      themeTitle: "",
      categoryCount: 0,
      questionCount: 0,
      errors: ["Invalid JSON object"],
    };
  }

  const title = (data.title_en as string) || "(no title)";
  if (!data.title_en) errors.push("Missing title_en");
  if (!data.title_es) errors.push("Missing title_es");

  const cats = data.categories;
  if (!Array.isArray(cats) || cats.length === 0) {
    errors.push("Missing or empty categories array");
    return { themeTitle: title, categoryCount: 0, questionCount: 0, errors };
  }

  let totalQuestions = 0;
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
  });

  return {
    themeTitle: title,
    categoryCount: cats.length,
    questionCount: totalQuestions,
    errors,
  };
}

export async function importThemeJson(json: ImportTheme) {
  const supabase = await createClient();

  // Get current user for creator_id
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Insert theme
  const { data: theme, error: themeErr } = await supabase
    .from("themes")
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

  if (themeErr) throw new Error(`Theme insert failed: ${themeErr.message}`);

  let totalInserted = 0;

  for (const cat of json.categories) {
    const { data: category, error: catErr } = await supabase
      .from("categories")
      .insert({
        theme_id: theme.id,
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
      totalInserted += rows.length;
    }
  }

  revalidatePath("/admin/topics");
  revalidatePath("/admin/questions");
  return { themeId: theme.id, questionsInserted: totalInserted };
}
