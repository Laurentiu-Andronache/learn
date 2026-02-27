import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";

export const QUESTION_TRANSLATION_FIELDS = new Set([
  "question_en", "question_es",
  "options_en", "options_es",
  "explanation_en", "explanation_es",
  "extra_en", "extra_es",
]);

export const FLASHCARD_TRANSLATION_FIELDS = new Set([
  "question_en", "question_es",
  "answer_en", "answer_es",
  "extra_en", "extra_es",
]);

export function validateTranslationFields(fields: Record<string, unknown>, allowedSet: Set<string> = QUESTION_TRANSLATION_FIELDS): string | null {
  const keys = Object.keys(fields);
  if (!keys.length) return "No fields provided";
  const invalid = keys.filter((k) => !allowedSet.has(k));
  if (invalid.length) return `Invalid translation fields: ${invalid.join(", ")}. Allowed: ${[...allowedSet].join(", ")}`;
  return null;
}

// Bilingual field pairs to check
export const QUESTION_PAIRS: Array<[string, string]> = [
  ["question_en", "question_es"],
  ["options_en", "options_es"],
  ["explanation_en", "explanation_es"],
  ["extra_en", "extra_es"],
];

export const FLASHCARD_PAIRS: Array<[string, string]> = [
  ["question_en", "question_es"],
  ["answer_en", "answer_es"],
  ["extra_en", "extra_es"],
];

const TOPIC_PAIRS: Array<[string, string]> = [
  ["title_en", "title_es"],
  ["description_en", "description_es"],
];

function isEmpty(val: unknown): boolean {
  return val === null || val === undefined || val === "";
}

export async function handleCheckTranslations(
  supabase: TypedClient,
  params: { topic_id: string; source_lang?: string }
): Promise<McpResult> {
  const targetSuffix = (params.source_lang ?? "en") === "en" ? "_es" : "_en";
  const missing: Array<{ type: string; id: string; field: string }> = [];

  // Fetch topic
  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .select("*")
    .eq("id", params.topic_id)
    .single();

  if (topicErr) return err(topicErr.message);
  if (!topic) return err("Topic not found");

  // Check topic fields
  for (const [en, es] of TOPIC_PAIRS) {
    const target = targetSuffix === "_es" ? es : en;
    if (isEmpty((topic as Record<string, unknown>)[target])) {
      missing.push({ type: "topic", id: topic.id, field: target });
    }
  }

  // Fetch categories
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("*")
    .eq("topic_id", params.topic_id);

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
