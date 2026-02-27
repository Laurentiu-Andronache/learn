import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";

export async function handleQuestionQualityReport(
  supabase: TypedClient,
  params: { topic_id?: string },
): Promise<McpResult> {
  let qQuery = supabase
    .from("questions")
    .select("id, type, question_en, question_es, options_en, options_es, explanation_en, explanation_es, correct_index, category_id");

  let fcQuery = supabase
    .from("flashcards")
    .select("id, question_en, question_es, answer_en, answer_es, extra_en, extra_es, category_id");

  if (params.topic_id) {
    const { data: cats, error: catErr } = await supabase
      .from("categories")
      .select("id")
      .eq("topic_id", params.topic_id);
    if (catErr) return err(catErr.message);
    const categoryIds = (cats || []).map((c) => c.id);
    if (categoryIds.length === 0) {
      return ok({ questions_checked: 0, question_issues: [], flashcards_checked: 0, flashcard_issues: [] });
    }
    qQuery = qQuery.in("category_id", categoryIds);
    fcQuery = fcQuery.in("category_id", categoryIds);
  }

  const { data: questions, error: qErr } = await qQuery;
  if (qErr) return err(qErr.message);

  const { data: flashcards, error: fErr } = await fcQuery;
  if (fErr) return err(fErr.message);

  const qs = questions || [];
  const questionIssues: Array<{ question_id: string; issue: string }> = [];

  for (const q of qs) {
    if (!q.explanation_en) questionIssues.push({ question_id: q.id, issue: "missing explanation_en" });
    if (!q.explanation_es) questionIssues.push({ question_id: q.id, issue: "missing explanation_es" });
    if (q.type === "multiple_choice") {
      if (!q.options_en) questionIssues.push({ question_id: q.id, issue: "multiple_choice missing options_en" });
      if (!q.options_es) questionIssues.push({ question_id: q.id, issue: "multiple_choice missing options_es" });
      if (q.options_en && q.options_es && q.options_en.length !== q.options_es.length) {
        questionIssues.push({ question_id: q.id, issue: "mismatched option counts between en/es" });
      }
    }
    if (!q.question_es) questionIssues.push({ question_id: q.id, issue: "missing question_es" });
  }

  const fcs = flashcards || [];
  const flashcardIssues: Array<{ flashcard_id: string; issue: string }> = [];

  for (const fc of fcs) {
    if (!fc.answer_en) flashcardIssues.push({ flashcard_id: fc.id, issue: "missing answer_en" });
    if (!fc.answer_es) flashcardIssues.push({ flashcard_id: fc.id, issue: "missing answer_es" });
    if (!fc.question_es) flashcardIssues.push({ flashcard_id: fc.id, issue: "missing question_es" });
  }

  return ok({
    questions_checked: qs.length,
    question_issues: questionIssues,
    flashcards_checked: fcs.length,
    flashcard_issues: flashcardIssues,
  });
}
