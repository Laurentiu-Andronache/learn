import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";
import { QUESTION_PAIRS, FLASHCARD_PAIRS } from "./check.js";

export async function handleCompareTranslations(
  supabase: TypedClient,
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
      .select("id, question_en, question_es, options_en, options_es, explanation_en, explanation_es, extra_en, extra_es, categories!inner(id, topic_id)");

    if (params.topic_id) {
      query = query.eq("categories.topic_id", params.topic_id);
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
      .select("id, question_en, question_es, answer_en, answer_es, extra_en, extra_es, categories!inner(id, topic_id)");

    if (params.topic_id) {
      fcQuery = fcQuery.eq("categories.topic_id", params.topic_id);
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
