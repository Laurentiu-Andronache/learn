import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";
import { QUESTION_PAIRS, FLASHCARD_PAIRS } from "./check.js";

const TOPIC_PAIRS: Array<[string, string]> = [
  ["title_en", "title_es"],
  ["description_en", "description_es"],
];

function isEmpty(val: unknown): boolean {
  return val === null || val === undefined || val === "";
}

export async function handleFindUntranslated(
  supabase: TypedClient,
  params: { lang?: string }
): Promise<McpResult> {
  const lang = params.lang ?? "es";
  const suffix = `_${lang}`;

  const SCAN_LIMIT = 1000;
  let truncated = false;

  // Check topics
  const { data: topics, error: tErr } = await supabase
    .from("topics")
    .select("id, title_en, title_es, description_en, description_es")
    .limit(SCAN_LIMIT);

  if (tErr) return err(tErr.message);
  if ((topics ?? []).length >= SCAN_LIMIT) truncated = true;

  const untranslatedTopics = (topics ?? []).filter((t: Record<string, unknown>) => {
    for (const [en, es] of TOPIC_PAIRS) {
      const field = suffix === "_es" ? es : en;
      const source = suffix === "_es" ? en : es;
      if (!isEmpty(t[source]) && isEmpty(t[field])) return true;
    }
    return false;
  }).map((t: Record<string, unknown>) => ({
    id: t.id,
    missing_fields: TOPIC_PAIRS
      .map(([en, es]) => suffix === "_es" ? es : en)
      .filter((f) => {
        const source = TOPIC_PAIRS.find(([en, es]) => (suffix === "_es" ? es : en) === f)!;
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
    topics: untranslatedTopics,
    categories: untranslatedCats,
    questions: untranslatedQuestions,
    flashcards: untranslatedFlashcards,
  });
}
