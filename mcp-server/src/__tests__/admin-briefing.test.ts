import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { chainable, createMockSupabase, extractJson } from "../test-helpers.js";
import { handleAdminBriefing } from "../tools/analytics.js";

function mockSupabaseWithAuth(authUsers: any[] = []) {
  const mock = createMockSupabase() as any;
  mock.auth = {
    admin: {
      listUsers: vi.fn().mockResolvedValue({
        data: { users: authUsers },
        error: null,
      }),
    },
  };
  return mock;
}

function defaultTableData(overrides: Record<string, any> = {}) {
  const base: Record<string, any> = {
    profiles: { data: [], error: null },
    review_logs: { data: [], error: null },
    quiz_attempts: { data: [], error: null },
    topics: { data: [], error: null },
    categories: { data: [], error: null },
    flashcards: { data: [], error: null },
    user_card_state: { data: [], error: null },
    feedback: { data: null, error: null, count: 0 },
    question_reports: { data: null, error: null, count: 0 },
    proposed_questions: { data: null, error: null, count: 0 },
    topic_proposals: { data: null, error: null, count: 0 },
    questions: { data: null, error: null, count: 0 },
  };
  return { ...base, ...overrides };
}

function setupMock(mock: any, tableData: Record<string, any>) {
  mock.from.mockImplementation((table: string) =>
    chainable(tableData[table] || { data: [], error: null }),
  );
}

describe("handleAdminBriefing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-12T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns comprehensive briefing with all data", async () => {
    const mock = mockSupabaseWithAuth([
      { id: "u1", email: "alice@test.com", is_anonymous: false, created_at: "2026-01-01T00:00:00Z" },
      { id: "u2", email: "bob@test.com", is_anonymous: false, created_at: "2026-02-10T00:00:00Z" },
    ]);
    setupMock(mock, defaultTableData({
      profiles: {
        data: [
          { id: "u1", display_name: "Alice", is_anonymous: false, created_at: "2026-01-01T00:00:00Z" },
          { id: "u2", display_name: "Bob", is_anonymous: false, created_at: "2026-02-10T00:00:00Z" },
        ],
        error: null,
      },
      review_logs: {
        data: [
          { user_id: "u1", flashcard_id: "fc1", rating: 3, answer_time_ms: 5000, was_correct: true, stability_before: null, reviewed_at: "2026-02-12T10:00:00Z" },
          { user_id: "u1", flashcard_id: "fc2", rating: 1, answer_time_ms: 3000, was_correct: false, stability_before: 2.5, reviewed_at: "2026-02-11T10:00:00Z" },
          { user_id: "u2", flashcard_id: "fc1", rating: 4, answer_time_ms: 2000, was_correct: true, stability_before: null, reviewed_at: "2026-02-12T08:00:00Z" },
        ],
        error: null,
      },
      quiz_attempts: {
        data: [
          { user_id: "u1", topic_id: "t1", score: 8, total: 10, completed_at: "2026-02-12T09:00:00Z" },
        ],
        error: null,
      },
      topics: { data: [{ id: "t1", title_en: "Science" }], error: null },
      categories: { data: [{ id: "c1", topic_id: "t1" }], error: null },
      flashcards: {
        data: [{ id: "fc1", category_id: "c1" }, { id: "fc2", category_id: "c1" }],
        error: null,
      },
      user_card_state: {
        data: [
          { user_id: "u1", state: "review", due: "2026-02-12T00:00:00Z" },
          { user_id: "u1", state: "learning", due: "2026-02-12T00:00:00Z" },
          { user_id: "u2", state: "review", due: "2026-02-15T00:00:00Z" },
        ],
        error: null,
      },
      feedback: { data: null, error: null, count: 3 },
      question_reports: { data: null, error: null, count: 1 },
      proposed_questions: { data: null, error: null, count: 2 },
      topic_proposals: { data: null, error: null, count: 0 },
      questions: { data: null, error: null, count: 50 },
    }));

    const result = await handleAdminBriefing(mock as any);
    const json = extractJson(result) as any;

    // Shape
    expect(json.generated_at).toBeDefined();
    expect(json.user_growth).toBeDefined();
    expect(json.engagement.last_24h).toBeDefined();
    expect(json.engagement.last_7d).toBeDefined();
    expect(json.learning_quality.card_state_distribution).toBeDefined();
    expect(json.user_details).toBeInstanceOf(Array);
    expect(json.topic_engagement_7d).toBeInstanceOf(Array);

    // User growth
    expect(json.user_growth.total_registered).toBe(2);
    expect(json.user_growth.total_anonymous).toBe(0);
    expect(json.user_growth.new_signups_7d).toBe(1); // Bob created 2026-02-10

    // Engagement 7d
    expect(json.engagement.last_7d.total_reviews).toBe(3);
    expect(json.engagement.last_7d.active_study_users).toBe(2);
    expect(json.engagement.last_7d.total_quiz_attempts).toBe(1);

    // Content snapshot
    expect(json.content_snapshot.active_topics).toBe(1);
    expect(json.content_snapshot.questions).toBe(50);
    expect(json.content_snapshot.flashcards).toBe(2);

    // Moderation
    expect(json.moderation_queue.pending_feedback).toBe(3);
    expect(json.moderation_queue.pending_question_reports).toBe(1);

    // Cards due now (u1: 1 review card due; learning doesn't count)
    const u1 = json.user_details.find((u: any) => u.email === "alice@test.com");
    expect(u1.cards_due_now).toBe(1);
  });

  it("handles empty data gracefully", async () => {
    const mock = mockSupabaseWithAuth([]);
    setupMock(mock, defaultTableData());

    const result = await handleAdminBriefing(mock as any);
    const json = extractJson(result) as any;

    expect(json.user_growth.total_registered).toBe(0);
    expect(json.user_growth.total_anonymous).toBe(0);
    expect(json.engagement.last_7d.total_reviews).toBe(0);
    expect(json.engagement.last_7d.active_study_users).toBe(0);
    expect(json.learning_quality.last_7d.accuracy_rate).toBeNull();
    expect(json.user_details).toEqual([]);
    expect(json.topic_engagement_7d).toEqual([]);
  });

  it("degrades gracefully on auth failure", async () => {
    const mock = mockSupabaseWithAuth([]);
    mock.auth.admin.listUsers.mockRejectedValue(new Error("Auth unavailable"));
    setupMock(mock, defaultTableData({
      profiles: {
        data: [{ id: "u1", display_name: "Alice", is_anonymous: false, created_at: "2026-01-01T00:00:00Z" }],
        error: null,
      },
      review_logs: {
        data: [
          { user_id: "u1", flashcard_id: "fc1", rating: 3, answer_time_ms: 5000, was_correct: true, stability_before: null, reviewed_at: "2026-02-12T10:00:00Z" },
        ],
        error: null,
      },
    }));

    const result = await handleAdminBriefing(mock as any);
    const json = extractJson(result) as any;

    // Auth failed → emails null
    expect(json.user_details[0].email).toBeNull();
    // But rest still works
    expect(json.engagement.last_7d.total_reviews).toBe(1);
    expect(json.user_growth.total_registered).toBe(1);
  });

  it("correctly partitions 24h vs 7d data", async () => {
    const mock = mockSupabaseWithAuth([]);
    setupMock(mock, defaultTableData({
      profiles: {
        data: [{ id: "u1", display_name: "A", is_anonymous: false, created_at: "2026-01-01T00:00:00Z" }],
        error: null,
      },
      review_logs: {
        data: [
          // Within 24h (after 2026-02-11T12:00:00Z)
          { user_id: "u1", flashcard_id: "fc1", rating: 3, answer_time_ms: null, was_correct: true, stability_before: null, reviewed_at: "2026-02-12T08:00:00Z" },
          // Within 7d but NOT 24h
          { user_id: "u1", flashcard_id: "fc2", rating: 2, answer_time_ms: null, was_correct: false, stability_before: 1.0, reviewed_at: "2026-02-08T08:00:00Z" },
          { user_id: "u1", flashcard_id: "fc3", rating: 4, answer_time_ms: null, was_correct: true, stability_before: 2.0, reviewed_at: "2026-02-07T08:00:00Z" },
        ],
        error: null,
      },
    }));

    const result = await handleAdminBriefing(mock as any);
    const json = extractJson(result) as any;

    expect(json.engagement.last_24h.total_reviews).toBe(1);
    expect(json.engagement.last_7d.total_reviews).toBe(3);
    expect(json.learning_quality.last_24h.new_cards_studied).toBe(1);
    expect(json.learning_quality.last_7d.new_cards_studied).toBe(1);
  });

  it("computes daily breakdown correctly", async () => {
    const mock = mockSupabaseWithAuth([]);
    setupMock(mock, defaultTableData({
      profiles: {
        data: [{ id: "u1", display_name: "A", is_anonymous: false, created_at: "2026-01-01T00:00:00Z" }],
        error: null,
      },
      review_logs: {
        data: [
          { user_id: "u1", flashcard_id: "fc1", rating: 3, answer_time_ms: null, was_correct: true, stability_before: null, reviewed_at: "2026-02-12T10:00:00Z" },
          { user_id: "u1", flashcard_id: "fc2", rating: 1, answer_time_ms: null, was_correct: false, stability_before: 1.0, reviewed_at: "2026-02-12T11:00:00Z" },
          { user_id: "u1", flashcard_id: "fc3", rating: 4, answer_time_ms: null, was_correct: true, stability_before: 2.0, reviewed_at: "2026-02-10T08:00:00Z" },
        ],
        error: null,
      },
    }));

    const result = await handleAdminBriefing(mock as any);
    const json = extractJson(result) as any;
    const u1 = json.user_details[0];

    const today = u1.daily_activity.find((d: any) => d.date === "2026-02-12");
    expect(today.reviews).toBe(2);
    expect(today.new_cards).toBe(1);

    const day2 = u1.daily_activity.find((d: any) => d.date === "2026-02-10");
    expect(day2.reviews).toBe(1);

    // 2026-02-11 has no activity
    const day1 = u1.daily_activity.find((d: any) => d.date === "2026-02-11");
    expect(day1.reviews).toBe(0);
    expect(day1.accuracy_rate).toBeNull();
  });

  it("calculates streaks correctly", async () => {
    const mock = mockSupabaseWithAuth([]);
    setupMock(mock, defaultTableData({
      profiles: {
        data: [{ id: "u1", display_name: "A", is_anonymous: false, created_at: "2026-01-01T00:00:00Z" }],
        error: null,
      },
      review_logs: {
        data: [
          // Active today + yesterday, gap on 2026-02-10, then 3 more days
          { user_id: "u1", flashcard_id: "fc1", rating: 3, answer_time_ms: null, was_correct: true, stability_before: null, reviewed_at: "2026-02-12T10:00:00Z" },
          { user_id: "u1", flashcard_id: "fc1", rating: 3, answer_time_ms: null, was_correct: true, stability_before: 1.0, reviewed_at: "2026-02-11T10:00:00Z" },
          { user_id: "u1", flashcard_id: "fc1", rating: 3, answer_time_ms: null, was_correct: true, stability_before: 1.0, reviewed_at: "2026-02-09T10:00:00Z" },
          { user_id: "u1", flashcard_id: "fc1", rating: 3, answer_time_ms: null, was_correct: true, stability_before: 1.0, reviewed_at: "2026-02-08T10:00:00Z" },
          { user_id: "u1", flashcard_id: "fc1", rating: 3, answer_time_ms: null, was_correct: true, stability_before: 1.0, reviewed_at: "2026-02-07T10:00:00Z" },
        ],
        error: null,
      },
    }));

    const result = await handleAdminBriefing(mock as any);
    const json = extractJson(result) as any;
    const u1 = json.user_details[0];

    expect(u1.current_streak).toBe(2); // today + yesterday, broken by gap on 2026-02-10
    expect(u1.active_days).toBe(5);
    expect(u1.missed_days).toBe(2);
  });

  it("maps flashcard→category→topic for engagement", async () => {
    const mock = mockSupabaseWithAuth([]);
    setupMock(mock, defaultTableData({
      profiles: {
        data: [{ id: "u1", display_name: "A", is_anonymous: false, created_at: "2026-01-01T00:00:00Z" }],
        error: null,
      },
      review_logs: {
        data: [
          { user_id: "u1", flashcard_id: "fc1", rating: 3, answer_time_ms: null, was_correct: true, stability_before: null, reviewed_at: "2026-02-12T10:00:00Z" },
          { user_id: "u1", flashcard_id: "fc2", rating: 3, answer_time_ms: null, was_correct: true, stability_before: 1.0, reviewed_at: "2026-02-12T11:00:00Z" },
          { user_id: "u1", flashcard_id: "fc3", rating: 4, answer_time_ms: null, was_correct: true, stability_before: 2.0, reviewed_at: "2026-02-12T11:30:00Z" },
        ],
        error: null,
      },
      topics: {
        data: [{ id: "t1", title_en: "Science" }, { id: "t2", title_en: "Math" }],
        error: null,
      },
      categories: {
        data: [{ id: "c1", topic_id: "t1" }, { id: "c2", topic_id: "t2" }],
        error: null,
      },
      flashcards: {
        data: [
          { id: "fc1", category_id: "c1" },
          { id: "fc2", category_id: "c1" },
          { id: "fc3", category_id: "c2" },
        ],
        error: null,
      },
    }));

    const result = await handleAdminBriefing(mock as any);
    const json = extractJson(result) as any;

    expect(json.topic_engagement_7d).toHaveLength(2);
    const science = json.topic_engagement_7d.find((t: any) => t.topic_title === "Science");
    expect(science.review_count).toBe(2);
    expect(science.unique_users).toBe(1);
    const math = json.topic_engagement_7d.find((t: any) => t.topic_title === "Math");
    expect(math.review_count).toBe(1);

    const u1 = json.user_details[0];
    expect(u1.summary_7d.topics_studied).toContain("Science");
    expect(u1.summary_7d.topics_studied).toContain("Math");
  });

  it("computes accuracy from rating distribution", async () => {
    const mock = mockSupabaseWithAuth([]);
    setupMock(mock, defaultTableData({
      profiles: {
        data: [{ id: "u1", display_name: "A", is_anonymous: false, created_at: "2026-01-01T00:00:00Z" }],
        error: null,
      },
      review_logs: {
        data: [
          { user_id: "u1", flashcard_id: "fc1", rating: 1, answer_time_ms: null, was_correct: false, stability_before: 1.0, reviewed_at: "2026-02-12T10:00:00Z" },
          { user_id: "u1", flashcard_id: "fc2", rating: 2, answer_time_ms: null, was_correct: false, stability_before: 1.0, reviewed_at: "2026-02-12T10:01:00Z" },
          { user_id: "u1", flashcard_id: "fc3", rating: 3, answer_time_ms: null, was_correct: true, stability_before: 1.0, reviewed_at: "2026-02-12T10:02:00Z" },
          { user_id: "u1", flashcard_id: "fc4", rating: 4, answer_time_ms: null, was_correct: true, stability_before: 1.0, reviewed_at: "2026-02-12T10:03:00Z" },
        ],
        error: null,
      },
    }));

    const result = await handleAdminBriefing(mock as any);
    const json = extractJson(result) as any;

    // Accuracy = ratings >= 3 / total = 2/4 = 50%
    expect(json.learning_quality.last_7d.accuracy_rate).toBe(50);
    expect(json.learning_quality.last_7d.reviews_by_rating).toEqual({ "1": 1, "2": 1, "3": 1, "4": 1 });
  });
});
