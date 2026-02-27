import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";

export async function handleListClaims(
  supabase: TypedClient,
  params: { topic_id: string },
): Promise<McpResult> {
  const [qRes, fRes] = await Promise.all([
    supabase.from("questions")
      .select("id, question_en, explanation_en, extra_en, categories!inner(topic_id)")
      .eq("categories.topic_id", params.topic_id),
    supabase.from("flashcards")
      .select("id, question_en, answer_en, extra_en, categories!inner(topic_id)")
      .eq("categories.topic_id", params.topic_id),
  ]);

  if (qRes.error) return err(qRes.error.message);
  if (fRes.error) return err(fRes.error.message);

  const claims: Array<{ id: string; type: string; field: string; claim: string }> = [];
  const claimPattern = /(\d+[\d.,]*\s*%|(?:most|least|strongest|weakest|highest|lowest|largest|smallest|best|worst|greatest|only|first|never|always|all|no |none|every)\b[^.]{0,80}\.?)/gi;

  for (const q of qRes.data ?? []) {
    for (const field of ["question_en", "explanation_en", "extra_en"] as const) {
      const text = (q as Record<string, unknown>)[field] as string | null;
      if (!text) continue;
      for (const match of text.matchAll(claimPattern)) {
        claims.push({ id: q.id, type: "question", field, claim: match[0].trim() });
      }
    }
  }

  for (const f of fRes.data ?? []) {
    for (const field of ["question_en", "answer_en", "extra_en"] as const) {
      const text = (f as Record<string, unknown>)[field] as string | null;
      if (!text) continue;
      for (const match of text.matchAll(claimPattern)) {
        claims.push({ id: f.id, type: "flashcard", field, claim: match[0].trim() });
      }
    }
  }

  return ok({ total_claims: claims.length, claims });
}
