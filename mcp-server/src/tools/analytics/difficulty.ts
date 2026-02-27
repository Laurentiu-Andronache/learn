import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";

export async function handleDifficultyAnalysis(
  supabase: TypedClient,
  params: { topic_id: string },
): Promise<McpResult> {
  const { data: flashcards, error: fErr } = await supabase
    .from("flashcards")
    .select("id, difficulty, question_en, categories!inner(topic_id)")
    .eq("categories.topic_id", params.topic_id);
  if (fErr) return err(fErr.message);

  const fcs = flashcards || [];
  const fcIds = fcs.map((fc) => fc.id);

  const reviewsByFc: Record<string, Array<{ was_correct: boolean | null }>> = {};
  if (fcIds.length > 0) {
    const { data: reviews, error: rErr } = await supabase
      .from("review_logs")
      .select("flashcard_id, was_correct")
      .in("flashcard_id", fcIds);
    if (rErr) return err(rErr.message);

    for (const r of reviews || []) {
      if (!reviewsByFc[r.flashcard_id]) reviewsByFc[r.flashcard_id] = [];
      reviewsByFc[r.flashcard_id].push(r);
    }
  }

  const analysis = fcs.map((fc) => {
    const rs = reviewsByFc[fc.id] || [];
    const total = rs.length;
    const correct = rs.filter((r) => r.was_correct).length;
    const pct = total > 0 ? Math.round((correct / total) * 10000) / 100 : null;

    let suggested = fc.difficulty;
    if (pct !== null) {
      if (pct > 80 && fc.difficulty > 1) suggested = fc.difficulty - 1;
      else if (pct < 40 && fc.difficulty < 10) suggested = fc.difficulty + 1;
    }

    return {
      flashcard_id: fc.id,
      question_en: fc.question_en,
      assigned_difficulty: fc.difficulty,
      total_reviews: total,
      correct_count: correct,
      actual_correct_pct: pct,
      suggested_difficulty: suggested,
    };
  });

  return ok({ topic_id: params.topic_id, flashcards: analysis });
}
