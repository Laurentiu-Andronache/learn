import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseClient } from "../supabase.js";
import { type McpResult, ok, err } from "../utils.js";

const QUESTION_TRANSLATION_FIELDS = new Set([
  "question_en", "question_es",
  "options_en", "options_es",
  "explanation_en", "explanation_es",
  "extra_en", "extra_es",
]);

const FLASHCARD_TRANSLATION_FIELDS = new Set([
  "question_en", "question_es",
  "answer_en", "answer_es",
  "extra_en", "extra_es",
]);

function validateTranslationFields(fields: Record<string, unknown>, allowedSet: Set<string> = QUESTION_TRANSLATION_FIELDS): string | null {
  const keys = Object.keys(fields);
  if (!keys.length) return "No fields provided";
  const invalid = keys.filter((k) => !allowedSet.has(k));
  if (invalid.length) return `Invalid translation fields: ${invalid.join(", ")}. Allowed: ${[...allowedSet].join(", ")}`;
  return null;
}

// Bilingual field pairs to check
const QUESTION_PAIRS: Array<[string, string]> = [
  ["question_en", "question_es"],
  ["options_en", "options_es"],
  ["explanation_en", "explanation_es"],
  ["extra_en", "extra_es"],
];

const FLASHCARD_PAIRS: Array<[string, string]> = [
  ["question_en", "question_es"],
  ["answer_en", "answer_es"],
  ["extra_en", "extra_es"],
];

const THEME_PAIRS: Array<[string, string]> = [
  ["title_en", "title_es"],
  ["description_en", "description_es"],
];

function isEmpty(val: unknown): boolean {
  return val === null || val === undefined || val === "";
}

// ─── Handlers ────────────────────────────────────────────────────────

export async function handleCheckTranslations(
  supabase: SupabaseClient,
  params: { topic_id: string; source_lang?: string }
): Promise<McpResult> {
  const targetSuffix = (params.source_lang ?? "en") === "en" ? "_es" : "_en";
  const missing: Array<{ type: string; id: string; field: string }> = [];

  // Fetch theme
  const { data: theme, error: themeErr } = await supabase
    .from("themes")
    .select("*")
    .eq("id", params.topic_id)
    .single();

  if (themeErr) return err(themeErr.message);
  if (!theme) return err("Topic not found");

  // Check theme fields
  for (const [en, es] of THEME_PAIRS) {
    const target = targetSuffix === "_es" ? es : en;
    if (isEmpty((theme as Record<string, unknown>)[target])) {
      missing.push({ type: "theme", id: theme.id, field: target });
    }
  }

  // Fetch categories
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("*")
    .eq("theme_id", params.topic_id);

  if (catErr) return err(catErr.message);

  for (const cat of categories ?? []) {
    const target = targetSuffix === "_es" ? "name_es" : "name_en";
    if (isEmpty((cat as Record<string, unknown>)[target])) {
      missing.push({ type: "category", id: cat.id, field: target });
    }
  }

  // Fetch questions via categories
  const catIds = (categories ?? []).map((c: { id: string }) => c.id);
  if (catIds.length) {
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("*")
      .in("category_id", catIds);

    if (qErr) return err(qErr.message);

    for (const q of questions ?? []) {
      for (const [en, es] of QUESTION_PAIRS) {
        const source = targetSuffix === "_es" ? en : es;
        const target = targetSuffix === "_es" ? es : en;
        if (!isEmpty((q as Record<string, unknown>)[source]) && isEmpty((q as Record<string, unknown>)[target])) {
          missing.push({ type: "question", id: q.id, field: target });
        }
      }
    }

    // Fetch flashcards via categories
    const { data: flashcards, error: fErr } = await supabase
      .from("flashcards")
      .select("*")
      .in("category_id", catIds);

    if (fErr) return err(fErr.message);

    for (const fc of flashcards ?? []) {
      for (const [en, es] of FLASHCARD_PAIRS) {
        const source = targetSuffix === "_es" ? en : es;
        const target = targetSuffix === "_es" ? es : en;
        if (!isEmpty((fc as Record<string, unknown>)[source]) && isEmpty((fc as Record<string, unknown>)[target])) {
          missing.push({ type: "flashcard", id: fc.id, field: target });
        }
      }
    }
  }

  return ok({
    topic_id: params.topic_id,
    source_lang: params.source_lang ?? "en",
    target_lang: targetSuffix === "_es" ? "es" : "en",
    missing_count: missing.length,
    missing,
  });
}

export async function handleFindUntranslated(
  supabase: SupabaseClient,
  params: { lang?: string }
): Promise<McpResult> {
  const lang = params.lang ?? "es";
  const suffix = `_${lang}`;

  const SCAN_LIMIT = 1000;
  let truncated = false;

  // Check themes
  const { data: themes, error: tErr } = await supabase
    .from("themes")
    .select("id, title_en, title_es, description_en, description_es")
    .limit(SCAN_LIMIT);

  if (tErr) return err(tErr.message);
  if ((themes ?? []).length >= SCAN_LIMIT) truncated = true;

  const untranslatedThemes = (themes ?? []).filter((t: Record<string, unknown>) => {
    for (const [en, es] of THEME_PAIRS) {
      const field = suffix === "_es" ? es : en;
      const source = suffix === "_es" ? en : es;
      if (!isEmpty(t[source]) && isEmpty(t[field])) return true;
    }
    return false;
  }).map((t: Record<string, unknown>) => ({
    id: t.id,
    missing_fields: THEME_PAIRS
      .map(([en, es]) => suffix === "_es" ? es : en)
      .filter((f) => {
        const source = THEME_PAIRS.find(([en, es]) => (suffix === "_es" ? es : en) === f)!;
        const srcField = suffix === "_es" ? source[0] : source[1];
        return !isEmpty(t[srcField]) && isEmpty(t[f]);
      }),
  }));

  // Check categories
  const { data: cats, error: cErr } = await supabase
    .from("categories")
    .select("id, name_en, name_es")
    .limit(SCAN_LIMIT);

  if (cErr) return err(cErr.message);
  if ((cats ?? []).length >= SCAN_LIMIT) truncated = true;

  const catField = suffix === "_es" ? "name_es" : "name_en";
  const catSource = suffix === "_es" ? "name_en" : "name_es";
  const untranslatedCats = (cats ?? []).filter(
    (c: Record<string, unknown>) => !isEmpty(c[catSource]) && isEmpty(c[catField])
  ).map((c: Record<string, unknown>) => ({ id: c.id, missing_field: catField }));

  // Check questions
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id, question_en, question_es, options_en, options_es, explanation_en, explanation_es, extra_en, extra_es")
    .limit(SCAN_LIMIT);

  if (qErr) return err(qErr.message);
  if ((questions ?? []).length >= SCAN_LIMIT) truncated = true;

  const untranslatedQuestions = (questions ?? []).filter((q: Record<string, unknown>) => {
    for (const [en, es] of QUESTION_PAIRS) {
      const field = suffix === "_es" ? es : en;
      const source = suffix === "_es" ? en : es;
      if (!isEmpty(q[source]) && isEmpty(q[field])) return true;
    }
    return false;
  }).map((q: Record<string, unknown>) => ({
    id: q.id,
    missing_fields: QUESTION_PAIRS
      .filter(([en, es]) => {
        const field = suffix === "_es" ? es : en;
        const source = suffix === "_es" ? en : es;
        return !isEmpty(q[source]) && isEmpty(q[field]);
      })
      .map(([en, es]) => suffix === "_es" ? es : en),
  }));

  // Check flashcards
  const { data: flashcards, error: fErr } = await supabase
    .from("flashcards")
    .select("id, question_en, question_es, answer_en, answer_es, extra_en, extra_es")
    .limit(SCAN_LIMIT);

  if (fErr) return err(fErr.message);
  if ((flashcards ?? []).length >= SCAN_LIMIT) truncated = true;

  const untranslatedFlashcards = (flashcards ?? []).filter((fc: Record<string, unknown>) => {
    for (const [en, es] of FLASHCARD_PAIRS) {
      const field = suffix === "_es" ? es : en;
      const source = suffix === "_es" ? en : es;
      if (!isEmpty(fc[source]) && isEmpty(fc[field])) return true;
    }
    return false;
  }).map((fc: Record<string, unknown>) => ({
    id: fc.id,
    missing_fields: FLASHCARD_PAIRS
      .filter(([en, es]) => {
        const field = suffix === "_es" ? es : en;
        const source = suffix === "_es" ? en : es;
        return !isEmpty(fc[source]) && isEmpty(fc[field]);
      })
      .map(([en, es]) => suffix === "_es" ? es : en),
  }));

  return ok({
    target_lang: lang,
    truncated,
    themes: untranslatedThemes,
    categories: untranslatedCats,
    questions: untranslatedQuestions,
    flashcards: untranslatedFlashcards,
  });
}

export async function handleCompareTranslations(
  supabase: SupabaseClient,
  params: { topic_id?: string; question_ids?: string[]; flashcard_ids?: string[]; fields?: string[] }
): Promise<McpResult> {
  if (!params.topic_id && !params.question_ids?.length && !params.flashcard_ids?.length) {
    return err("Must provide either topic_id, question_ids, or flashcard_ids");
  }

  const result: { questions?: unknown[]; flashcards?: unknown[] } = {};

  // Compare questions (unless only flashcard_ids provided)
  if (!params.flashcard_ids?.length || params.topic_id || params.question_ids?.length) {
    let query = supabase
      .from("questions")
      .select("id, question_en, question_es, options_en, options_es, explanation_en, explanation_es, extra_en, extra_es, categories!inner(id, theme_id)");

    if (params.topic_id) {
      query = query.eq("categories.theme_id", params.topic_id);
    }
    if (params.question_ids?.length) {
      query = query.in("id", params.question_ids);
    }

    const { data, error } = await query;
    if (error) return err(error.message);

    const fieldPairs = params.fields?.length
      ? QUESTION_PAIRS.filter(([en]) => params.fields!.includes(en.replace(/_en$/, "")))
      : QUESTION_PAIRS;

    result.questions = (data ?? []).map((q: Record<string, unknown>) => ({
      id: q.id,
      fields: Object.fromEntries(
        fieldPairs.map(([en, es]) => [
          en.replace(/_en$/, ""),
          { en: q[en], es: q[es] },
        ])
      ),
    }));
  }

  // Compare flashcards
  if (params.flashcard_ids?.length || params.topic_id) {
    let fcQuery = supabase
      .from("flashcards")
      .select("id, question_en, question_es, answer_en, answer_es, extra_en, extra_es, categories!inner(id, theme_id)");

    if (params.topic_id) {
      fcQuery = fcQuery.eq("categories.theme_id", params.topic_id);
    }
    if (params.flashcard_ids?.length) {
      fcQuery = fcQuery.in("id", params.flashcard_ids);
    }

    const { data: fcData, error: fcError } = await fcQuery;
    if (fcError) return err(fcError.message);

    const fcFieldPairs = params.fields?.length
      ? FLASHCARD_PAIRS.filter(([en]) => params.fields!.includes(en.replace(/_en$/, "")))
      : FLASHCARD_PAIRS;

    result.flashcards = (fcData ?? []).map((fc: Record<string, unknown>) => ({
      id: fc.id,
      fields: Object.fromEntries(
        fcFieldPairs.map(([en, es]) => [
          en.replace(/_en$/, ""),
          { en: fc[en], es: fc[es] },
        ])
      ),
    }));
  }

  return ok(result);
}

export async function handleUpdateTranslation(
  supabase: SupabaseClient,
  params: { question_id: string; fields: Record<string, unknown> }
): Promise<McpResult> {
  const validationErr = validateTranslationFields(params.fields);
  if (validationErr) return err(validationErr);

  const { data, error } = await supabase
    .from("questions")
    .update(params.fields)
    .eq("id", params.question_id)
    .select()
    .single();

  if (error) return err(error.message);
  console.error(`[audit] Updated translation for question ${params.question_id}`);
  return ok(data);
}

export async function handleBatchUpdateTranslations(
  supabase: SupabaseClient,
  params: { updates: Array<{ question_id: string; fields: Record<string, unknown> }> }
): Promise<McpResult> {
  if (!params.updates.length) return err("Updates array cannot be empty");

  // Validate all fields upfront
  for (const u of params.updates) {
    const validationErr = validateTranslationFields(u.fields);
    if (validationErr) return err(`Question ${u.question_id}: ${validationErr}`);
  }

  const results = { updated: 0, errors: [] as Array<{ question_id: string; error: string }> };

  for (const { question_id, fields } of params.updates) {
    const { error } = await supabase
      .from("questions")
      .update(fields)
      .eq("id", question_id)
      .select()
      .single();

    if (error) {
      results.errors.push({ question_id, error: error.message });
    } else {
      results.updated++;
    }
  }

  console.error(`[audit] Batch translation update: ${results.updated} updated, ${results.errors.length} errors`);
  return ok(results);
}

export async function handleUpdateFlashcardTranslation(
  supabase: SupabaseClient,
  params: { flashcard_id: string; fields: Record<string, unknown> }
): Promise<McpResult> {
  const validationErr = validateTranslationFields(params.fields, FLASHCARD_TRANSLATION_FIELDS);
  if (validationErr) return err(validationErr);

  const { data, error } = await supabase
    .from("flashcards")
    .update(params.fields)
    .eq("id", params.flashcard_id)
    .select()
    .single();

  if (error) return err(error.message);
  console.error(`[audit] Updated translation for flashcard ${params.flashcard_id}`);
  return ok(data);
}

export async function handleBatchUpdateFlashcardTranslations(
  supabase: SupabaseClient,
  params: { updates: Array<{ flashcard_id: string; fields: Record<string, unknown> }> }
): Promise<McpResult> {
  if (!params.updates.length) return err("Updates array cannot be empty");

  for (const u of params.updates) {
    const validationErr = validateTranslationFields(u.fields, FLASHCARD_TRANSLATION_FIELDS);
    if (validationErr) return err(`Flashcard ${u.flashcard_id}: ${validationErr}`);
  }

  const results = { updated: 0, errors: [] as Array<{ flashcard_id: string; error: string }> };

  for (const { flashcard_id, fields } of params.updates) {
    const { error } = await supabase
      .from("flashcards")
      .update(fields)
      .eq("id", flashcard_id)
      .select()
      .single();

    if (error) {
      results.errors.push({ flashcard_id, error: error.message });
    } else {
      results.updated++;
    }
  }

  console.error(`[audit] Batch flashcard translation update: ${results.updated} updated, ${results.errors.length} errors`);
  return ok(results);
}

// ─── Registration ────────────────────────────────────────────────────

export function registerTranslationTools(server: McpServer): void {
  server.tool(
    "learn_check_translations",
    "Audit bilingual completeness for a topic. Checks theme, categories, questions, and flashcards for missing translations.",
    {
      topic_id: z.string().uuid().describe("Topic UUID to audit"),
      source_lang: z.enum(["en", "es"]).optional().describe("Source language (default 'en')"),
    },
    { readOnlyHint: true },
    async (params) => handleCheckTranslations(getSupabaseClient(), params)
  );

  server.tool(
    "learn_find_untranslated",
    "Global scan for any content missing translations across themes, categories, questions, and flashcards.",
    {
      lang: z.enum(["en", "es"]).optional().describe("Target language to check (default 'es')"),
    },
    { readOnlyHint: true },
    async (params) => handleFindUntranslated(getSupabaseClient(), params)
  );

  server.tool(
    "learn_compare_translations",
    "Side-by-side EN/ES display for translation review.",
    {
      topic_id: z.string().uuid().optional().describe("Filter by topic"),
      question_ids: z.array(z.string().uuid()).optional().describe("Specific question UUIDs"),
      flashcard_ids: z.array(z.string().uuid()).optional().describe("Specific flashcard UUIDs"),
      fields: z.array(z.string()).optional().describe("Field names to compare (e.g. 'question', 'explanation')"),
    },
    { readOnlyHint: true },
    async (params) => handleCompareTranslations(getSupabaseClient(), params)
  );

  server.tool(
    "learn_update_translation",
    "Update translation fields for a single question.",
    {
      question_id: z.string().uuid().describe("Question UUID"),
      fields: z.record(z.unknown()).describe("Translation fields to update (e.g. { question_es: '...' })"),
    },
    async (params) => handleUpdateTranslation(getSupabaseClient(), params as any)
  );

  server.tool(
    "learn_batch_update_translations",
    "Batch update translation fields across multiple questions.",
    {
      updates: z.array(
        z.object({
          question_id: z.string().uuid(),
          fields: z.record(z.unknown()),
        })
      ).describe("Array of { question_id, fields } objects"),
    },
    async (params) => handleBatchUpdateTranslations(getSupabaseClient(), params as any)
  );

  server.tool(
    "learn_update_flashcard_translation",
    "Update translation fields for a single flashcard.",
    {
      flashcard_id: z.string().uuid().describe("Flashcard UUID"),
      fields: z.record(z.unknown()).describe("Translation fields to update (e.g. { answer_es: '...' })"),
    },
    async (params) => handleUpdateFlashcardTranslation(getSupabaseClient(), params as any)
  );

  server.tool(
    "learn_batch_update_flashcard_translations",
    "Batch update translation fields across multiple flashcards.",
    {
      updates: z.array(
        z.object({
          flashcard_id: z.string().uuid(),
          fields: z.record(z.unknown()),
        })
      ).describe("Array of { flashcard_id, fields } objects"),
    },
    async (params) => handleBatchUpdateFlashcardTranslations(getSupabaseClient(), params as any)
  );
}
