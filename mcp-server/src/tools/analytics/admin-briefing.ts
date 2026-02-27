import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";

type CountResult = { count: number | null };

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

  // Partition 7d -> 24h using Date comparison for format safety
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
      questions: (questionsRes as CountResult).count ?? 0,
      flashcards: flashcardRows.length,
    },
    moderation_queue: {
      pending_feedback: (feedbackRes as CountResult).count ?? 0,
      pending_question_reports: (reportsRes as CountResult).count ?? 0,
      pending_proposed_questions: (proposedQRes as CountResult).count ?? 0,
      pending_topic_proposals: (topicProposalsRes as CountResult).count ?? 0,
    },
  });
}
