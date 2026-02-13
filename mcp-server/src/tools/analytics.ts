import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type TypedClient, getSupabaseClient } from "../supabase.js";
import { type McpResult, ok, err } from "../utils.js";

// ─── learn_topic_stats ─────────────────────────────────────────────
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

// ─── learn_content_overview ────────────────────────────────────────
export async function handleContentOverview(
  supabase: TypedClient,
): Promise<McpResult> {
  const { data: topics, error: tErr } = await supabase
    .from("topics")
    .select("id, title_en, title_es, is_active, categories(id, questions(id, question_es, options_es, explanation_es), flashcards(id, question_es, answer_es))")
    .eq("is_active", true);
  if (tErr) return err(tErr.message);

  const ts = topics || [];
  let totalCats = 0;
  let totalQs = 0;
  let totalFcs = 0;

  const topicStats = ts.map((t) => {
    const cats = t.categories || [];
    const qs = cats.flatMap((c) => c.questions || []);
    const fcs = cats.flatMap((c) => c.flashcards || []);
    totalCats += cats.length;
    totalQs += qs.length;
    totalFcs += fcs.length;
    const qTranslated = qs.filter(
      (q) => q.question_es && q.explanation_es,
    ).length;
    const fcTranslated = fcs.filter(
      (fc) => fc.question_es && fc.answer_es,
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

// ─── learn_user_activity_stats ─────────────────────────────────────
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

// ─── learn_difficulty_analysis ─────────────────────────────────────
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

// ─── learn_content_health ─────────────────────────────────────────
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

// ─── learn_admin_briefing ──────────────────────────────────────────
export async function handleAdminBriefing(
  supabase: TypedClient,
): Promise<McpResult> {
  const now = new Date();
  const oneDayAgoMs = now.getTime() - 86_400_000;
  const sevenDaysAgoMs = now.getTime() - 7 * 86_400_000;
  const sevenDaysAgoISO = new Date(sevenDaysAgoMs).toISOString();
  const nowMs = now.getTime();

  // 7-day date keys: [0]=today .. [6]=6 days ago
  const dayKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    dayKeys.push(new Date(nowMs - i * 86_400_000).toISOString().slice(0, 10));
  }

  // Auth users (graceful degradation — source of truth for is_anonymous + email)
  type AuthUser = { id: string; email?: string; is_anonymous?: boolean; created_at?: string };
  let authUsers: AuthUser[] = [];
  const authPromise = supabase.auth.admin
    .listUsers({ perPage: 1000 })
    .then((r) => { if (r.data?.users) authUsers = r.data.users as AuthUser[]; })
    .catch(() => {});

  // Fire all queries in parallel
  const [, profilesRes, reviewsRes, quizzesRes, topicsRes, categoriesRes,
    flashcardsRes, cardStatesRes, feedbackRes, reportsRes, proposedQRes,
    topicProposalsRes, questionsRes,
  ] = await Promise.all([
    authPromise,
    supabase.from("profiles").select("id, display_name, is_anonymous, created_at"),
    supabase.from("review_logs")
      .select("user_id, flashcard_id, rating, answer_time_ms, was_correct, stability_before, reviewed_at")
      .gte("reviewed_at", sevenDaysAgoISO),
    supabase.from("quiz_attempts")
      .select("user_id, topic_id, score, total, completed_at")
      .gte("completed_at", sevenDaysAgoISO),
    supabase.from("topics").select("id, title_en").eq("is_active", true),
    supabase.from("categories").select("id, topic_id"),
    supabase.from("flashcards").select("id, category_id"),
    supabase.from("user_card_state").select("user_id, state, due"),
    supabase.from("feedback").select("id", { count: "exact", head: true }),
    supabase.from("question_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("proposed_questions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("topic_proposals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("questions").select("id", { count: "exact", head: true }),
  ]);

  const profiles = profilesRes.data || [];
  const reviews7d = (reviewsRes.data || []) as Array<{
    user_id: string; flashcard_id: string; rating: number;
    answer_time_ms: number | null; was_correct: boolean | null;
    stability_before: number | null; reviewed_at: string;
  }>;
  const quizzes7d = (quizzesRes.data || []) as Array<{
    user_id: string; topic_id: string; score: number; total: number; completed_at: string;
  }>;
  const topics = topicsRes.data || [];
  const categories = categoriesRes.data || [];
  const flashcardRows = flashcardsRes.data || [];
  const cardStates = (cardStatesRes.data || []) as Array<{ user_id: string; state: string; due: string }>;

  // Lookup maps — auth is source of truth for email + is_anonymous
  const authMap = new Map<string, { email: string | null; is_anonymous: boolean }>();
  for (const u of authUsers) authMap.set(u.id, { email: u.email ?? null, is_anonymous: u.is_anonymous ?? false });

  const profileMap = new Map<string, { display_name: string | null; is_anonymous: boolean; created_at: string }>();
  for (const p of profiles) profileMap.set(p.id, p);

  const catToTopic = new Map<string, string>();
  for (const c of categories) catToTopic.set(c.id, c.topic_id);

  const fcToCat = new Map<string, string>();
  for (const f of flashcardRows) fcToCat.set(f.id, f.category_id);

  const topicNames = new Map<string, string>();
  for (const t of topics) topicNames.set(t.id, t.title_en);

  // Partition 7d → 24h using Date comparison for format safety
  const reviews24h = reviews7d.filter((r) => new Date(r.reviewed_at).getTime() >= oneDayAgoMs);
  const quizzes24h = quizzes7d.filter((q) => new Date(q.completed_at).getTime() >= oneDayAgoMs);

  // --- Engagement helper ---
  function computeEngagement(reviews: typeof reviews7d, quizzes: typeof quizzes7d) {
    const studyUsers = new Set(reviews.map((r) => r.user_id));
    const quizUsers = new Set(quizzes.map((q) => q.user_id));
    let timeSum = 0, timeCount = 0;
    for (const r of reviews) {
      if (r.answer_time_ms != null) { timeSum += r.answer_time_ms; timeCount++; }
    }
    return {
      active_study_users: studyUsers.size,
      active_quiz_users: quizUsers.size,
      total_reviews: reviews.length,
      total_quiz_attempts: quizzes.length,
      avg_reviews_per_user: studyUsers.size > 0 ? Math.round((reviews.length / studyUsers.size) * 10) / 10 : 0,
      avg_answer_time_ms: timeCount > 0 ? Math.round(timeSum / timeCount) : null,
    };
  }

  // --- Learning quality helper ---
  function computeQuality(reviews: typeof reviews7d) {
    let correct = 0, newCards = 0;
    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const r of reviews) {
      if (r.rating >= 3) correct++;
      if (r.stability_before == null) newCards++;
      byRating[r.rating] = (byRating[r.rating] || 0) + 1;
    }
    return {
      accuracy_rate: reviews.length > 0 ? Math.round((correct / reviews.length) * 10000) / 100 : null,
      new_cards_studied: newCards,
      reviews_by_rating: byRating,
    };
  }

  // --- Card state distribution ---
  const stateDist: Record<string, number> = { new: 0, learning: 0, review: 0, relearning: 0 };
  for (const cs of cardStates) {
    if (cs.state in stateDist) stateDist[cs.state]++;
  }

  // --- User growth (auth.users.is_anonymous is source of truth) ---
  let totalRegistered = 0, totalAnonymous = 0;
  const newSignups: Array<{ email: string | null; display_name: string | null; is_anonymous: boolean; created_at: string }> = [];
  for (const p of profiles) {
    const auth = authMap.get(p.id);
    const isAnon = auth?.is_anonymous ?? p.is_anonymous; // prefer auth, fallback to profile
    if (isAnon) totalAnonymous++;
    else totalRegistered++;
    if (new Date(p.created_at).getTime() >= sevenDaysAgoMs) {
      newSignups.push({
        email: auth?.email ?? null,
        display_name: p.display_name,
        is_anonymous: isAnon,
        created_at: p.created_at,
      });
    }
  }
  newSignups.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const newSignups24h = newSignups.filter((s) => new Date(s.created_at).getTime() >= oneDayAgoMs).length;

  // --- Per-user aggregation ---
  type DayBucket = { reviews: number; quizzes: number; new_cards: number; correct: number; total: number };
  const userDayMap = new Map<string, Map<string, DayBucket>>();
  const userTopicSet = new Map<string, Set<string>>();
  const userReviews = new Map<string, number>();
  const userQuizzes = new Map<string, number>();
  const userTimes = new Map<string, number[]>();

  function getDay(uid: string, day: string): DayBucket {
    if (!userDayMap.has(uid)) userDayMap.set(uid, new Map());
    const m = userDayMap.get(uid)!;
    if (!m.has(day)) m.set(day, { reviews: 0, quizzes: 0, new_cards: 0, correct: 0, total: 0 });
    return m.get(day)!;
  }

  for (const r of reviews7d) {
    const day = r.reviewed_at.slice(0, 10);
    const b = getDay(r.user_id, day);
    b.reviews++;
    b.total++;
    if (r.rating >= 3) b.correct++;
    if (r.stability_before == null) b.new_cards++;
    userReviews.set(r.user_id, (userReviews.get(r.user_id) || 0) + 1);

    const catId = fcToCat.get(r.flashcard_id);
    if (catId) {
      const topicId = catToTopic.get(catId);
      if (topicId) {
        if (!userTopicSet.has(r.user_id)) userTopicSet.set(r.user_id, new Set());
        userTopicSet.get(r.user_id)!.add(topicId);
      }
    }
    if (r.answer_time_ms != null) {
      if (!userTimes.has(r.user_id)) userTimes.set(r.user_id, []);
      userTimes.get(r.user_id)!.push(r.answer_time_ms);
    }
  }

  for (const q of quizzes7d) {
    const day = q.completed_at.slice(0, 10);
    getDay(q.user_id, day).quizzes++;
    userQuizzes.set(q.user_id, (userQuizzes.get(q.user_id) || 0) + 1);
  }

  // Per-user cards due now
  const userDueNow = new Map<string, number>();
  for (const cs of cardStates) {
    if ((cs.state === "review" || cs.state === "relearning") && new Date(cs.due).getTime() <= nowMs) {
      userDueNow.set(cs.user_id, (userDueNow.get(cs.user_id) || 0) + 1);
    }
  }

  // All relevant users: active in 7d OR have due cards
  const relevant = new Set<string>();
  for (const r of reviews7d) relevant.add(r.user_id);
  for (const q of quizzes7d) relevant.add(q.user_id);
  for (const [uid] of userDueNow) relevant.add(uid);

  const userDetails = [...relevant].map((uid) => {
    const profile = profileMap.get(uid);
    const dm = userDayMap.get(uid);

    let totalCorrect = 0, totalRated = 0, totalNew = 0;
    if (dm) for (const [, b] of dm) { totalCorrect += b.correct; totalRated += b.total; totalNew += b.new_cards; }

    const times = userTimes.get(uid);
    const avgTime = times?.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

    const topicIds = userTopicSet.get(uid);
    const topicTitles = topicIds ? [...topicIds].map((tid) => topicNames.get(tid) || tid).sort() : [];

    const daily = dayKeys.map((day) => {
      const b = dm?.get(day);
      return {
        date: day,
        reviews: b?.reviews || 0,
        quizzes: b?.quizzes || 0,
        new_cards: b?.new_cards || 0,
        accuracy_rate: b && b.total > 0 ? Math.round((b.correct / b.total) * 10000) / 100 : null,
      };
    });

    const activeDays = daily.filter((d) => d.reviews > 0 || d.quizzes > 0).length;

    let streak = 0;
    for (const day of dayKeys) {
      const b = dm?.get(day);
      if (b && (b.reviews > 0 || b.quizzes > 0)) streak++;
      else break;
    }

    const auth = authMap.get(uid);
    return {
      email: auth?.email ?? null,
      display_name: profile?.display_name ?? null,
      is_anonymous: auth?.is_anonymous ?? profile?.is_anonymous ?? false,
      summary_7d: {
        review_count: userReviews.get(uid) || 0,
        quiz_count: userQuizzes.get(uid) || 0,
        accuracy_rate: totalRated > 0 ? Math.round((totalCorrect / totalRated) * 10000) / 100 : null,
        new_cards_studied: totalNew,
        avg_answer_time_ms: avgTime,
        topics_studied: topicTitles,
      },
      daily_activity: daily,
      active_days: activeDays,
      missed_days: 7 - activeDays,
      current_streak: streak,
      cards_due_now: userDueNow.get(uid) || 0,
    };
  });

  userDetails.sort((a, b) =>
    (b.summary_7d.review_count + b.summary_7d.quiz_count) - (a.summary_7d.review_count + a.summary_7d.quiz_count),
  );

  // --- Topic engagement ---
  const topicEng = new Map<string, { count: number; users: Set<string> }>();
  for (const r of reviews7d) {
    const catId = fcToCat.get(r.flashcard_id);
    if (!catId) continue;
    const topicId = catToTopic.get(catId);
    if (!topicId) continue;
    if (!topicEng.has(topicId)) topicEng.set(topicId, { count: 0, users: new Set() });
    const e = topicEng.get(topicId)!;
    e.count++;
    e.users.add(r.user_id);
  }

  const topicEngagement7d = [...topicEng.entries()]
    .map(([topic_id, { count, users }]) => ({
      topic_id,
      topic_title: topicNames.get(topic_id) || topic_id,
      review_count: count,
      unique_users: users.size,
    }))
    .sort((a, b) => b.review_count - a.review_count);

  return ok({
    generated_at: now.toISOString(),
    user_growth: {
      total_registered: totalRegistered,
      total_anonymous: totalAnonymous,
      new_signups_24h: newSignups24h,
      new_signups_7d: newSignups.length,
      new_signups_list: newSignups,
    },
    engagement: {
      last_24h: computeEngagement(reviews24h, quizzes24h),
      last_7d: computeEngagement(reviews7d, quizzes7d),
    },
    learning_quality: {
      last_24h: computeQuality(reviews24h),
      last_7d: computeQuality(reviews7d),
      card_state_distribution: stateDist,
    },
    user_details: userDetails,
    topic_engagement_7d: topicEngagement7d,
    content_snapshot: {
      active_topics: topics.length,
      categories: categories.length,
      questions: (questionsRes as any).count ?? 0,
      flashcards: flashcardRows.length,
    },
    moderation_queue: {
      pending_feedback: (feedbackRes as any).count ?? 0,
      pending_question_reports: (reportsRes as any).count ?? 0,
      pending_proposed_questions: (proposedQRes as any).count ?? 0,
      pending_topic_proposals: (topicProposalsRes as any).count ?? 0,
    },
  });
}

// ─── learn_list_claims ─────────────────────────────────────────────
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

  server.tool(
    "learn_admin_briefing",
    "Comprehensive admin dashboard: user growth, engagement (24h/7d), learning quality, per-user daily activity, streaks, topic engagement, content snapshot, moderation queue",
    {},
    { readOnlyHint: true },
    async () => handleAdminBriefing(getSupabaseClient()),
  );

  server.tool(
    "learn_list_claims",
    "Extract numeric claims, percentages, and superlatives from all content in a topic for fact-check review. Scans question text, explanations, answers, and extras.",
    { topic_id: z.string().uuid().describe("Topic UUID to scan for claims") },
    { readOnlyHint: true },
    async ({ topic_id }) => handleListClaims(getSupabaseClient(), { topic_id }),
  );
}
