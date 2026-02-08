import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseClient } from "../supabase.js";

type McpResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

function ok(data: unknown): McpResult {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(msg: string): McpResult {
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

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
      difficulty_distribution: {},
      type_breakdown: { multiple_choice: 0, true_false: 0 },
      translation_completeness_pct: 100,
    });
  }

  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id, difficulty, type, question_es, options_es, explanation_es")
    .in("category_id", categoryIds);
  if (qErr) return err(qErr.message);

  const qs = questions || [];
  const diffDist: Record<number, number> = {};
  const typeCounts = { multiple_choice: 0, true_false: 0 };
  let translated = 0;

  for (const q of qs) {
    diffDist[q.difficulty] = (diffDist[q.difficulty] || 0) + 1;
    if (q.type === "multiple_choice") typeCounts.multiple_choice++;
    else typeCounts.true_false++;
    if (q.question_es && q.explanation_es && (q.type === "true_false" || q.options_es))
      translated++;
  }

  return ok({
    topic_id,
    category_count: categoryIds.length,
    question_count: qs.length,
    difficulty_distribution: diffDist,
    type_breakdown: typeCounts,
    translation_completeness_pct: qs.length > 0 ? Math.round((translated / qs.length) * 10000) / 100 : 100,
  });
}

// ─── learn_content_overview ────────────────────────────────────────
export async function handleContentOverview(
  supabase: SupabaseClient,
): Promise<McpResult> {
  const { data: topics, error: tErr } = await supabase
    .from("themes")
    .select("id, title_en, title_es, is_active, categories(id, questions(id, question_es, options_es, explanation_es))")
    .eq("is_active", true);
  if (tErr) return err(tErr.message);

  const ts = topics || [];
  let totalCats = 0;
  let totalQs = 0;

  const topicStats = ts.map((t: any) => {
    const cats = t.categories || [];
    const qs = cats.flatMap((c: any) => c.questions || []);
    totalCats += cats.length;
    totalQs += qs.length;
    const translated = qs.filter(
      (q: any) => q.question_es && q.explanation_es,
    ).length;
    return {
      id: t.id,
      title_en: t.title_en,
      category_count: cats.length,
      question_count: qs.length,
      translation_pct: qs.length > 0 ? Math.round((translated / qs.length) * 10000) / 100 : 100,
    };
  });

  return ok({
    topics: topicStats,
    totals: { topics: ts.length, categories: totalCats, questions: totalQs },
  });
}

// ─── learn_question_quality_report ─────────────────────────────────
export async function handleQuestionQualityReport(
  supabase: SupabaseClient,
  params: { topic_id?: string },
): Promise<McpResult> {
  let query = supabase
    .from("questions")
    .select("id, type, question_en, question_es, options_en, options_es, explanation_en, explanation_es, correct_index, category_id");

  if (params.topic_id) {
    query = query.in(
      "category_id",
      supabase.from("categories").select("id").eq("theme_id", params.topic_id) as any,
    );
  }

  const { data: questions, error: qErr } = await query;
  if (qErr) return err(qErr.message);

  const qs = questions || [];
  const issues: Array<{ question_id: string; issue: string }> = [];

  for (const q of qs) {
    if (!q.explanation_en) issues.push({ question_id: q.id, issue: "missing explanation_en" });
    if (!q.explanation_es) issues.push({ question_id: q.id, issue: "missing explanation_es" });
    if (q.type === "multiple_choice") {
      if (!q.options_en) issues.push({ question_id: q.id, issue: "multiple_choice missing options_en" });
      if (!q.options_es) issues.push({ question_id: q.id, issue: "multiple_choice missing options_es" });
      if (q.options_en && q.options_es && q.options_en.length !== q.options_es.length) {
        issues.push({ question_id: q.id, issue: "mismatched option counts between en/es" });
      }
    }
    if (!q.question_es) issues.push({ question_id: q.id, issue: "missing question_es" });
  }

  return ok({ total_checked: qs.length, issues });
}

// ─── learn_user_activity_stats ─────────────────────────────────────
export async function handleUserActivityStats(
  supabase: SupabaseClient,
  params: { topic_id?: string; since?: string },
): Promise<McpResult> {
  let query = supabase
    .from("review_logs")
    .select("user_id, mode, was_correct, question_id, reviewed_at");

  if (params.since) {
    query = query.gte("reviewed_at", params.since);
  }

  const { data: logs, error: logErr } = await query;
  if (logErr) return err(logErr.message);

  const reviews = logs || [];
  const userSet = new Set(reviews.map((r: any) => r.user_id));
  const modeCount: Record<string, number> = {};
  const incorrectByQ: Record<string, number> = {};

  for (const r of reviews) {
    modeCount[r.mode] = (modeCount[r.mode] || 0) + 1;
    if (r.was_correct === false) {
      incorrectByQ[r.question_id] = (incorrectByQ[r.question_id] || 0) + 1;
    }
  }

  const hardest = Object.entries(incorrectByQ)
    .map(([question_id, incorrect_count]) => ({ question_id, incorrect_count }))
    .sort((a, b) => b.incorrect_count - a.incorrect_count)
    .slice(0, 10);

  return ok({
    total_reviews: reviews.length,
    unique_users: userSet.size,
    reviews_per_mode: modeCount,
    hardest_questions: hardest,
  });
}

// ─── learn_difficulty_analysis ─────────────────────────────────────
export async function handleDifficultyAnalysis(
  supabase: SupabaseClient,
  params: { topic_id: string },
): Promise<McpResult> {
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id, difficulty, question_en, categories!inner(theme_id)")
    .eq("categories.theme_id", params.topic_id);
  if (qErr) return err(qErr.message);

  const qs = questions || [];
  const qIds = qs.map((q: any) => q.id);

  const reviewsByQ: Record<string, Array<{ was_correct: boolean }>> = {};
  if (qIds.length > 0) {
    const { data: reviews, error: rErr } = await supabase
      .from("review_logs")
      .select("question_id, was_correct")
      .in("question_id", qIds);
    if (rErr) return err(rErr.message);

    for (const r of reviews || []) {
      if (!reviewsByQ[r.question_id]) reviewsByQ[r.question_id] = [];
      reviewsByQ[r.question_id].push(r);
    }
  }

  const analysis = qs.map((q: any) => {
    const rs = reviewsByQ[q.id] || [];
    const total = rs.length;
    const correct = rs.filter((r) => r.was_correct).length;
    const pct = total > 0 ? Math.round((correct / total) * 10000) / 100 : null;

    let suggested = q.difficulty;
    if (pct !== null) {
      if (pct > 80 && q.difficulty > 1) suggested = q.difficulty - 1;
      else if (pct < 40 && q.difficulty < 10) suggested = q.difficulty + 1;
    }

    return {
      question_id: q.id,
      question_en: q.question_en,
      assigned_difficulty: q.difficulty,
      total_reviews: total,
      correct_count: correct,
      actual_correct_pct: pct,
      suggested_difficulty: suggested,
    };
  });

  return ok({ topic_id: params.topic_id, questions: analysis });
}

// ─── Registration ──────────────────────────────────────────────────
export function registerAnalyticsTools(server: McpServer): void {
  server.tool(
    "learn_topic_stats",
    "Get statistics for a specific topic: category count, question count, difficulty distribution, type breakdown, translation completeness",
    { topic_id: z.string().uuid().describe("Topic UUID") },
    async ({ topic_id }) => handleTopicStats(getSupabaseClient(), { topic_id }),
  );

  server.tool(
    "learn_content_overview",
    "Global content dashboard: per-topic stats (category count, question count, translation %) and totals",
    {},
    async () => handleContentOverview(getSupabaseClient()),
  );

  server.tool(
    "learn_question_quality_report",
    "Find quality issues: missing translations, explanations, mismatched option counts",
    { topic_id: z.string().uuid().optional().describe("Optional topic UUID filter") },
    async ({ topic_id }) => handleQuestionQualityReport(getSupabaseClient(), { topic_id }),
  );

  server.tool(
    "learn_user_activity_stats",
    "User engagement stats: total reviews, unique users, reviews per mode, hardest questions",
    {
      topic_id: z.string().uuid().optional().describe("Optional topic UUID filter"),
      since: z.string().optional().describe("ISO date string filter"),
    },
    async ({ topic_id, since }) => handleUserActivityStats(getSupabaseClient(), { topic_id, since }),
  );

  server.tool(
    "learn_difficulty_analysis",
    "Compare assigned difficulty vs actual performance for questions in a topic",
    { topic_id: z.string().uuid().describe("Topic UUID") },
    async ({ topic_id }) => handleDifficultyAnalysis(getSupabaseClient(), { topic_id }),
  );
}
