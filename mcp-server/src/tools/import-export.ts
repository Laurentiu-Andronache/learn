import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseClient } from "../supabase.js";
import { type McpResult, ok, err } from "../utils.js";

/* ── Types ── */

interface ImportQuestion {
  type: string; question_en: string; question_es: string;
  options_en: string[] | null; options_es: string[] | null;
  correct_index: number | null; explanation_en: string | null; explanation_es: string | null;
  extra_en?: string | null; extra_es?: string | null; difficulty?: number;
}

interface ImportFlashcard {
  question_en: string; question_es: string;
  answer_en: string; answer_es: string;
  extra_en?: string | null; extra_es?: string | null;
  difficulty?: number;
}

interface ImportCategory {
  name_en: string; name_es: string; slug: string; color?: string | null;
  questions: ImportQuestion[];
  flashcards?: ImportFlashcard[];
}

interface ImportTopic {
  title_en: string; title_es: string;
  description_en?: string | null; description_es?: string | null;
  icon?: string | null; color?: string | null;
  categories: ImportCategory[];
}

/* ── learn_export_topic ── */

export async function handleExportTopic(
  supabase: SupabaseClient,
  params: { topic_id: string; include_ids?: boolean },
): Promise<McpResult> {
  const includeIds = params.include_ids ?? false;

  const { data: topic, error: tErr } = await supabase
    .from("topics")
    .select("*")
    .eq("id", params.topic_id)
    .single();

  if (tErr) return err(tErr.message);

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("topic_id", params.topic_id)
    .order("created_at", { ascending: true });

  const catIds = (categories ?? []).map((c: any) => c.id);

  const noneGuard = catIds.length > 0 ? catIds : ["__none__"];

  const [{ data: questions }, { data: flashcards }] = await Promise.all([
    supabase.from("questions").select("*").in("category_id", noneGuard).order("created_at", { ascending: true }),
    supabase.from("flashcards").select("*").in("category_id", noneGuard).order("created_at", { ascending: true }),
  ]);

  // Group by category_id
  const qByCat: Record<string, any[]> = {};
  for (const q of questions ?? []) {
    const cid = (q as any).category_id;
    if (!qByCat[cid]) qByCat[cid] = [];
    qByCat[cid].push(q);
  }
  const fByCat: Record<string, any[]> = {};
  for (const f of flashcards ?? []) {
    const cid = (f as any).category_id;
    if (!fByCat[cid]) fByCat[cid] = [];
    fByCat[cid].push(f);
  }

  const exportData: any = {
    title_en: topic.title_en,
    title_es: topic.title_es,
    description_en: topic.description_en ?? null,
    description_es: topic.description_es ?? null,
    icon: topic.icon ?? null,
    color: topic.color ?? null,
    categories: (categories ?? []).map((c: any) => ({
      ...(includeIds ? { id: c.id } : {}),
      name_en: c.name_en,
      name_es: c.name_es,
      slug: c.slug,
      color: c.color ?? null,
      questions: (qByCat[c.id] ?? []).map((q: any) => ({
        ...(includeIds ? { id: q.id } : {}),
        type: q.type,
        question_en: q.question_en,
        question_es: q.question_es,
        options_en: q.options_en,
        options_es: q.options_es,
        correct_index: q.correct_index,
        explanation_en: q.explanation_en,
        explanation_es: q.explanation_es,
        extra_en: q.extra_en ?? null,
        extra_es: q.extra_es ?? null,
        difficulty: q.difficulty ?? 5,
      })),
      flashcards: (fByCat[c.id] ?? []).map((f: any) => ({
        ...(includeIds ? { id: f.id } : {}),
        question_en: f.question_en,
        question_es: f.question_es,
        answer_en: f.answer_en,
        answer_es: f.answer_es,
        extra_en: f.extra_en ?? null,
        extra_es: f.extra_es ?? null,
        difficulty: f.difficulty ?? 5,
      })),
    })),
  };

  return ok(exportData);
}

/* ── learn_import_topic ── */

export async function handleImportTopic(
  supabase: SupabaseClient,
  params: { data: ImportTopic },
): Promise<McpResult> {
  const { data: topic } = params;

  // Insert topic
  const { data: newTopic, error: tErr } = await supabase
    .from("topics")
    .insert({
      title_en: topic.title_en,
      title_es: topic.title_es,
      description_en: topic.description_en ?? null,
      description_es: topic.description_es ?? null,
      icon: topic.icon ?? null,
      color: topic.color ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (tErr) return err(tErr.message);

  let categoriesCreated = 0;
  let questionsCreated = 0;
  let flashcardsCreated = 0;

  for (const cat of topic.categories) {
    const { data: newCat, error: cErr } = await supabase
      .from("categories")
      .insert({
        topic_id: newTopic.id,
        name_en: cat.name_en,
        name_es: cat.name_es,
        slug: cat.slug,
        color: cat.color ?? null,
      })
      .select()
      .single();

    if (cErr) return err(`Category "${cat.name_en}": ${cErr.message}`);
    categoriesCreated++;

    if (cat.questions.length > 0) {
      const qRows = cat.questions.map((q) => ({
        category_id: newCat.id,
        type: q.type,
        question_en: q.question_en,
        question_es: q.question_es,
        options_en: q.options_en,
        options_es: q.options_es,
        correct_index: q.correct_index,
        explanation_en: q.explanation_en,
        explanation_es: q.explanation_es,
        extra_en: q.extra_en ?? null,
        extra_es: q.extra_es ?? null,
        difficulty: q.difficulty ?? 5,
      }));

      const { data: insertedQs, error: qErr } = await supabase
        .from("questions")
        .insert(qRows)
        .select();

      if (qErr) return err(`Questions in "${cat.name_en}": ${qErr.message}`);
      questionsCreated += (insertedQs ?? []).length;
    }

    if (cat.flashcards && cat.flashcards.length > 0) {
      const fRows = cat.flashcards.map((f) => ({
        category_id: newCat.id,
        question_en: f.question_en,
        question_es: f.question_es,
        answer_en: f.answer_en,
        answer_es: f.answer_es,
        extra_en: f.extra_en ?? null,
        extra_es: f.extra_es ?? null,
        difficulty: f.difficulty ?? 5,
      }));

      const { data: insertedFs, error: fErr } = await supabase
        .from("flashcards")
        .insert(fRows)
        .select();

      if (fErr) return err(`Flashcards in "${cat.name_en}": ${fErr.message}`);
      flashcardsCreated += (insertedFs ?? []).length;
    }
  }

  console.error(`[audit] imported topic ${newTopic.id}: ${topic.title_en} (${categoriesCreated} cats, ${questionsCreated} qs, ${flashcardsCreated} fcs)`);
  return ok({
    topic_id: newTopic.id,
    categories_created: categoriesCreated,
    questions_created: questionsCreated,
    flashcards_created: flashcardsCreated,
  });
}

/* ── learn_validate_import ── */

export async function handleValidateImport(
  params: { data: any },
): Promise<McpResult> {
  const { data } = params;
  const errors: string[] = [];

  if (!data.title_en) errors.push("Missing title_en");
  if (!data.title_es) errors.push("Missing title_es");

  const categories = data.categories ?? [];
  let totalQuestions = 0;
  let totalFlashcards = 0;

  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    if (!cat.name_en) errors.push(`Category ${ci}: missing name_en`);
    if (!cat.name_es) errors.push(`Category ${ci}: missing name_es`);
    if (!cat.slug) errors.push(`Category ${ci}: missing slug`);

    const questions = cat.questions ?? [];
    totalQuestions += questions.length;

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const prefix = `Category ${ci}, Question ${qi}`;

      if (!["multiple_choice", "true_false"].includes(q.type)) {
        errors.push(`${prefix}: invalid type "${q.type}"`);
      }
      if (!q.question_en) errors.push(`${prefix}: missing question_en`);
      if (!q.question_es) errors.push(`${prefix}: missing question_es`);

      if (q.type === "multiple_choice") {
        if (!q.options_en || !Array.isArray(q.options_en) || q.options_en.length === 0) {
          errors.push(`${prefix}: multiple_choice requires options_en`);
        }
        if (!q.options_es || !Array.isArray(q.options_es) || q.options_es.length === 0) {
          errors.push(`${prefix}: multiple_choice requires options_es`);
        }
      }
    }

    const flashcards = cat.flashcards ?? [];
    totalFlashcards += flashcards.length;

    for (let fi = 0; fi < flashcards.length; fi++) {
      const f = flashcards[fi];
      const prefix = `Category ${ci}, Flashcard ${fi}`;

      if (!f.question_en) errors.push(`${prefix}: missing question_en`);
      if (!f.question_es) errors.push(`${prefix}: missing question_es`);
      if (!f.answer_en) errors.push(`${prefix}: missing answer_en`);
      if (!f.answer_es) errors.push(`${prefix}: missing answer_es`);
    }
  }

  return ok({
    valid: errors.length === 0,
    errors,
    summary: {
      title_en: data.title_en || "(missing)",
      categories: categories.length,
      questions: totalQuestions,
      flashcards: totalFlashcards,
    },
  });
}

/* ── learn_duplicate_topic ── */

export async function handleDuplicateTopic(
  supabase: SupabaseClient,
  params: { topic_id: string; new_title_en?: string; new_title_es?: string },
): Promise<McpResult> {
  // Export source topic
  const exportResult = await handleExportTopic(supabase, { topic_id: params.topic_id });
  if ((exportResult as any).isError) return exportResult;

  const source = JSON.parse(exportResult.content[0].text);

  // Override titles
  source.title_en = params.new_title_en ?? `${source.title_en} (Copy)`;
  source.title_es = params.new_title_es ?? `${source.title_es} (Copia)`;

  // Import as new
  const importResult = await handleImportTopic(supabase, { data: source });
  if ((importResult as any).isError) return importResult;

  const imported = JSON.parse(importResult.content[0].text);

  console.error(`[audit] duplicated topic ${params.topic_id} → ${imported.topic_id}`);
  return ok({
    source_topic_id: params.topic_id,
    new_topic_id: imported.topic_id,
    categories_created: imported.categories_created,
    questions_created: imported.questions_created,
    flashcards_created: imported.flashcards_created ?? 0,
  });
}

/* ── Zod schemas for import ── */

const importQuestionSchema = z.object({
  type: z.string(),
  question_en: z.string(),
  question_es: z.string(),
  options_en: z.array(z.string()).nullable(),
  options_es: z.array(z.string()).nullable(),
  correct_index: z.number().nullable(),
  explanation_en: z.string().nullable(),
  explanation_es: z.string().nullable(),
  extra_en: z.string().nullable().optional(),
  extra_es: z.string().nullable().optional(),
  difficulty: z.number().optional(),
});

const importFlashcardSchema = z.object({
  question_en: z.string(),
  question_es: z.string(),
  answer_en: z.string(),
  answer_es: z.string(),
  extra_en: z.string().nullable().optional(),
  extra_es: z.string().nullable().optional(),
  difficulty: z.number().optional(),
});

const importCategorySchema = z.object({
  name_en: z.string(),
  name_es: z.string(),
  slug: z.string(),
  color: z.string().nullable().optional(),
  questions: z.array(importQuestionSchema),
  flashcards: z.array(importFlashcardSchema).optional(),
});

const importTopicSchema = z.object({
  title_en: z.string(),
  title_es: z.string(),
  description_en: z.string().nullable().optional(),
  description_es: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  categories: z.array(importCategorySchema),
});

/* ── Registration ── */

export function registerImportExportTools(server: McpServer): void {
  server.tool(
    "learn_export_topic",
    "Export a topic as ImportTopic JSON (for backup or duplication)",
    {
      topic_id: z.string().describe("Topic UUID to export"),
      include_ids: z.boolean().default(false).describe("Include DB IDs in export"),
    },
    { readOnlyHint: true },
    async (params) => handleExportTopic(getSupabaseClient(), params),
  );

  server.tool(
    "learn_import_topic",
    "Import a full topic from ImportTopic JSON (creates topic + categories + questions + flashcards)",
    {
      data: importTopicSchema.describe("ImportTopic JSON object"),
    },
    async (params) => handleImportTopic(getSupabaseClient(), params),
  );

  server.tool(
    "learn_validate_import",
    "Validate import JSON without inserting (dry-run check)",
    {
      data: z.any().describe("ImportTopic JSON to validate"),
    },
    { readOnlyHint: true },
    async (params) => handleValidateImport(params),
  );

  server.tool(
    "learn_duplicate_topic",
    "Clone an existing topic with all categories, questions, and flashcards",
    {
      topic_id: z.string().describe("Source topic UUID"),
      new_title_en: z.string().optional().describe("Title for clone (English)"),
      new_title_es: z.string().optional().describe("Title for clone (Spanish)"),
    },
    async (params) => handleDuplicateTopic(getSupabaseClient(), params),
  );
}
