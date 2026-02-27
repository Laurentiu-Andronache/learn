import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";

export async function handleContentHealth(
  supabase: TypedClient,
): Promise<McpResult> {
  // Fetch all active topics with nested content
  const { data: topics, error: tErr } = await supabase
    .from("topics")
    .select("id, title_en, title_es, is_active, categories(id, questions(id, question_es, options_es, explanation_es, type, options_en), flashcards(id, question_es, answer_es, answer_en))")
    .eq("is_active", true);
  if (tErr) return err(tErr.message);

  const ts = topics || [];
  let totalCats = 0, totalQs = 0, totalFcs = 0;
  let globalQIssues = 0, globalFcIssues = 0;
  let globalQUntranslated = 0, globalFcUntranslated = 0;

  const topicSummaries = ts.map((t) => {
    const cats = t.categories || [];
    const qs = cats.flatMap((c) => c.questions || []);
    const fcs = cats.flatMap((c) => c.flashcards || []);
    totalCats += cats.length;
    totalQs += qs.length;
    totalFcs += fcs.length;

    // Quality issues
    let qIssueCount = 0;
    for (const q of qs) {
      if (!q.explanation_es) qIssueCount++;
      if (q.type === "multiple_choice" && (!q.options_es || (q.options_en && q.options_es && q.options_en.length !== q.options_es.length))) qIssueCount++;
    }
    let fcIssueCount = 0;
    for (const fc of fcs) {
      if (!fc.answer_en || !fc.answer_es) fcIssueCount++;
    }
    globalQIssues += qIssueCount;
    globalFcIssues += fcIssueCount;

    // Translation completeness
    const qUntranslated = qs.filter((q) => !q.question_es).length;
    const fcUntranslated = fcs.filter((fc) => !fc.question_es || !fc.answer_es).length;
    globalQUntranslated += qUntranslated;
    globalFcUntranslated += fcUntranslated;

    return {
      id: t.id,
      title_en: t.title_en,
      categories: cats.length,
      questions: qs.length,
      flashcards: fcs.length,
      question_issues: qIssueCount,
      flashcard_issues: fcIssueCount,
      untranslated_questions: qUntranslated,
      untranslated_flashcards: fcUntranslated,
    };
  });

  return ok({
    topics: topicSummaries,
    totals: {
      topics: ts.length,
      categories: totalCats,
      questions: totalQs,
      flashcards: totalFcs,
    },
    global_issues: {
      question_quality_issues: globalQIssues,
      flashcard_quality_issues: globalFcIssues,
      untranslated_questions: globalQUntranslated,
      untranslated_flashcards: globalFcUntranslated,
    },
  });
}
