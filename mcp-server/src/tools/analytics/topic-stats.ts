import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";

export async function handleTopicStats(
  supabase: TypedClient,
  params: { topic_id: string },
): Promise<McpResult> {
  const { topic_id } = params;

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("topic_id", topic_id);
  if (catErr) return err(catErr.message);

  const categoryIds = (categories || []).map((c) => c.id);
  if (categoryIds.length === 0) {
    return ok({
      topic_id,
      category_count: 0,
      question_count: 0,
      flashcard_count: 0,
      difficulty_distribution: {},
      type_breakdown: { multiple_choice: 0, true_false: 0 },
      translation_completeness_pct: 100,
      flashcard_translation_completeness_pct: 100,
    });
  }

  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id, difficulty, type, question_es, options_es, explanation_es")
    .in("category_id", categoryIds);
  if (qErr) return err(qErr.message);

  const { data: flashcards, error: fErr } = await supabase
    .from("flashcards")
    .select("id, difficulty, question_es, answer_es")
    .in("category_id", categoryIds);
  if (fErr) return err(fErr.message);

  const qs = questions || [];
  const fcs = flashcards || [];
  const diffDist: Record<number, number> = {};
  const typeCounts = { multiple_choice: 0, true_false: 0 };
  let qTranslated = 0;

  for (const q of qs) {
    diffDist[q.difficulty] = (diffDist[q.difficulty] || 0) + 1;
    if (q.type === "multiple_choice") typeCounts.multiple_choice++;
    else typeCounts.true_false++;
    if (q.question_es && q.explanation_es && (q.type === "true_false" || q.options_es))
      qTranslated++;
  }

  const fcDiffDist: Record<number, number> = {};
  let fcTranslated = 0;
  for (const fc of fcs) {
    fcDiffDist[fc.difficulty] = (fcDiffDist[fc.difficulty] || 0) + 1;
    if (fc.question_es && fc.answer_es) fcTranslated++;
  }

  return ok({
    topic_id,
    category_count: categoryIds.length,
    question_count: qs.length,
    flashcard_count: fcs.length,
    difficulty_distribution: diffDist,
    flashcard_difficulty_distribution: fcDiffDist,
    type_breakdown: typeCounts,
    translation_completeness_pct: qs.length > 0 ? Math.round((qTranslated / qs.length) * 10000) / 100 : 100,
    flashcard_translation_completeness_pct: fcs.length > 0 ? Math.round((fcTranslated / fcs.length) * 10000) / 100 : 100,
  });
}
