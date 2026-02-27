import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";

export async function handleUserActivityStats(
  supabase: TypedClient,
  params: { topic_id?: string; since?: string },
): Promise<McpResult> {
  // If topic_id provided, resolve to flashcard IDs via categories
  let topicFlashcardIds: string[] | null = null;
  if (params.topic_id) {
    const { data: cats, error: catErr } = await supabase
      .from("categories")
      .select("id")
      .eq("topic_id", params.topic_id);
    if (catErr) return err(catErr.message);
    const catIds = (cats || []).map((c) => c.id);
    if (catIds.length === 0) {
      return ok({ total_reviews: 0, unique_users: 0, hardest_flashcards: [] });
    }
    const { data: fcs, error: fcErr } = await supabase
      .from("flashcards")
      .select("id")
      .in("category_id", catIds);
    if (fcErr) return err(fcErr.message);
    topicFlashcardIds = (fcs || []).map((f) => f.id);
    if (topicFlashcardIds.length === 0) {
      return ok({ total_reviews: 0, unique_users: 0, hardest_flashcards: [] });
    }
  }

  let query = supabase
    .from("review_logs")
    .select("user_id, was_correct, flashcard_id, reviewed_at");

  if (params.since) {
    query = query.gte("reviewed_at", params.since);
  }
  if (topicFlashcardIds) {
    query = query.in("flashcard_id", topicFlashcardIds);
  }

  const { data: logs, error: logErr } = await query;
  if (logErr) return err(logErr.message);

  const reviews = logs || [];
  const userSet = new Set(reviews.map((r) => r.user_id));
  const incorrectByFc: Record<string, number> = {};

  for (const r of reviews) {
    if (r.was_correct === false) {
      incorrectByFc[r.flashcard_id] = (incorrectByFc[r.flashcard_id] || 0) + 1;
    }
  }

  const hardest = Object.entries(incorrectByFc)
    .map(([flashcard_id, incorrect_count]) => ({ flashcard_id, incorrect_count }))
    .sort((a, b) => b.incorrect_count - a.incorrect_count)
    .slice(0, 10);

  return ok({
    total_reviews: reviews.length,
    unique_users: userSet.size,
    hardest_flashcards: hardest,
  });
}
