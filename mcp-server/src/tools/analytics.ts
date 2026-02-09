import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseClient } from "../supabase.js";
import { type McpResult, ok, err } from "../utils.js";

// ─── learn_topic_stats ─────────────────────────────────────────────
export async function handleTopicStats(
  supabase: SupabaseClient,
  params: { topic_id: string },
): Promise<McpResult> {
  const { topic_id } = params;

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("theme_id", topic_id);
  if (catErr) return err(catErr.message);

  const categoryIds = (categories || []).map((c: any) => c.id);
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

// ─── learn_content_overview ────────────────────────────────────────
export async function handleContentOverview(
  supabase: SupabaseClient,
): Promise<McpResult> {
  const { data: topics, error: tErr } = await supabase
    .from("themes")
    .select("id, title_en, title_es, is_active, categories(id, questions(id, question_es, options_es, explanation_es), flashcards(id, question_es, answer_es))")
    .eq("is_active", true);
  if (tErr) return err(tErr.message);

  const ts = topics || [];
  let totalCats = 0;
  let totalQs = 0;
  let totalFcs = 0;

  const topicStats = ts.map((t: any) => {
    const cats = t.categories || [];
    const qs = cats.flatMap((c: any) => c.questions || []);
    const fcs = cats.flatMap((c: any) => c.flashcards || []);
    totalCats += cats.length;
    totalQs += qs.length;
    totalFcs += fcs.length;
    const qTranslated = qs.filter(
      (q: any) => q.question_es && q.explanation_es,
    ).length;
    const fcTranslated = fcs.filter(
      (fc: any) => fc.question_es && fc.answer_es,
    ).length;
    return {
      id: t.id,
      title_en: t.title_en,
      category_count: cats.length,
      question_count: qs.length,
      flashcard_count: fcs.length,
      question_translation_pct: qs.length > 0 ? Math.round((qTranslated / qs.length) * 10000) / 100 : 100,
      flashcard_translation_pct: fcs.length > 0 ? Math.round((fcTranslated / fcs.length) * 10000) / 100 : 100,
    };
  });

  return ok({
    topics: topicStats,
    totals: { topics: ts.length, categories: totalCats, questions: totalQs, flashcards: totalFcs },
  });
}

// ─── learn_question_quality_report ─────────────────────────────────
export async function handleQuestionQualityReport(
  supabase: SupabaseClient,
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
      .eq("theme_id", params.topic_id);
    if (catErr) return err(catErr.message);
    const categoryIds = (cats || []).map((c: any) => c.id);
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

// ─── learn_user_activity_stats ─────────────────────────────────────
export async function handleUserActivityStats(
  supabase: SupabaseClient,
  params: { topic_id?: string; since?: string },
): Promise<McpResult> {
  // If topic_id provided, resolve to flashcard IDs via categories
  let topicFlashcardIds: string[] | null = null;
  if (params.topic_id) {
    const { data: cats, error: catErr } = await supabase
      .from("categories")
      .select("id")
      .eq("theme_id", params.topic_id);
    if (catErr) return err(catErr.message);
    const catIds = (cats || []).map((c: any) => c.id);
    if (catIds.length === 0) {
      return ok({ total_reviews: 0, unique_users: 0, hardest_flashcards: [] });
    }
    const { data: fcs, error: fcErr } = await supabase
      .from("flashcards")
      .select("id")
      .in("category_id", catIds);
    if (fcErr) return err(fcErr.message);
    topicFlashcardIds = (fcs || []).map((f: any) => f.id);
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
  const userSet = new Set(reviews.map((r: any) => r.user_id));
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

// ─── learn_difficulty_analysis ─────────────────────────────────────
export async function handleDifficultyAnalysis(
  supabase: SupabaseClient,
  params: { topic_id: string },
): Promise<McpResult> {
  const { data: flashcards, error: fErr } = await supabase
    .from("flashcards")
    .select("id, difficulty, question_en, categories!inner(theme_id)")
    .eq("categories.theme_id", params.topic_id);
  if (fErr) return err(fErr.message);

  const fcs = flashcards || [];
  const fcIds = fcs.map((fc: any) => fc.id);

  const reviewsByFc: Record<string, Array<{ was_correct: boolean }>> = {};
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

  const analysis = fcs.map((fc: any) => {
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

// ─── learn_content_health ─────────────────────────────────────────
export async function handleContentHealth(
  supabase: SupabaseClient,
): Promise<McpResult> {
  // Fetch all active topics with nested content
  const { data: topics, error: tErr } = await supabase
    .from("themes")
    .select("id, title_en, title_es, is_active, categories(id, questions(id, question_es, options_es, explanation_es, type, options_en), flashcards(id, question_es, answer_es, answer_en))")
    .eq("is_active", true);
  if (tErr) return err(tErr.message);

  const ts = topics || [];
  let totalCats = 0, totalQs = 0, totalFcs = 0;
  let globalQIssues = 0, globalFcIssues = 0;
  let globalQUntranslated = 0, globalFcUntranslated = 0;

  const topicSummaries = ts.map((t: any) => {
    const cats = t.categories || [];
    const qs = cats.flatMap((c: any) => c.questions || []);
    const fcs = cats.flatMap((c: any) => c.flashcards || []);
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
    const qUntranslated = qs.filter((q: any) => !q.question_es).length;
    const fcUntranslated = fcs.filter((fc: any) => !fc.question_es || !fc.answer_es).length;
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

// ─── Registration ──────────────────────────────────────────────────
export function registerAnalyticsTools(server: McpServer): void {
  server.tool(
    "learn_topic_stats",
    "Get statistics for a specific topic: category count, question count, difficulty distribution, type breakdown, translation completeness",
    { topic_id: z.string().uuid().describe("Topic UUID") },
    { readOnlyHint: true },
    async ({ topic_id }) => handleTopicStats(getSupabaseClient(), { topic_id }),
  );

  server.tool(
    "learn_content_overview",
    "Global content dashboard: per-topic stats (category count, question count, translation %) and totals",
    {},
    { readOnlyHint: true },
    async () => handleContentOverview(getSupabaseClient()),
  );

  server.tool(
    "learn_question_quality_report",
    "Find quality issues: missing translations, explanations, mismatched option counts",
    { topic_id: z.string().uuid().optional().describe("Optional topic UUID filter") },
    { readOnlyHint: true },
    async ({ topic_id }) => handleQuestionQualityReport(getSupabaseClient(), { topic_id }),
  );

  server.tool(
    "learn_user_activity_stats",
    "User engagement stats: total flashcard reviews, unique users, hardest flashcards (by incorrect rate)",
    {
      topic_id: z.string().uuid().optional().describe("Optional topic UUID filter"),
      since: z.string().optional().describe("ISO date string filter"),
    },
    { readOnlyHint: true },
    async ({ topic_id, since }) => handleUserActivityStats(getSupabaseClient(), { topic_id, since }),
  );

  server.tool(
    "learn_difficulty_analysis",
    "Compare assigned difficulty vs actual performance for questions in a topic",
    { topic_id: z.string().uuid().describe("Topic UUID") },
    { readOnlyHint: true },
    async ({ topic_id }) => handleDifficultyAnalysis(getSupabaseClient(), { topic_id }),
  );

  server.tool(
    "learn_content_health",
    "Combined content health dashboard: per-topic summary with quality issues, translation gaps, and totals in a single call",
    {},
    { readOnlyHint: true },
    async () => handleContentHealth(getSupabaseClient()),
  );
}
