import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  createMockSupabase,
  extractJson,
  extractText,
} from "../test-helpers.js";
import {
  handleListFeedback,
  handleDeleteFeedback,
  handleListProposedQuestions,
  handleReviewProposedQuestion,
  handleListThemeProposals,
  handleReviewThemeProposal,
} from "../tools/feedback.js";

function mockSupabase() {
  return createMockSupabase();
}

const SAMPLE_FEEDBACK = {
  id: "f1",
  user_id: "u1",
  type: "bug",
  message: "Something broken",
  url: "https://example.com",
  user_agent: "Chrome",
  created_at: "2026-01-01T00:00:00Z",
};

const SAMPLE_PROPOSED_Q = {
  id: "pq1",
  category_id: "c1",
  submitted_by: "u1",
  type: "multiple_choice",
  question_en: "What is DNA?",
  question_es: "¿Qué es el ADN?",
  options_en: ["A", "B", "C", "D"],
  options_es: ["A", "B", "C", "D"],
  correct_index: 0,
  explanation_en: "Molecule of life",
  explanation_es: "Molécula de la vida",
  status: "pending",
  admin_notes: null,
  created_at: "2026-01-01T00:00:00Z",
  reviewed_at: null,
  reviewed_by: null,
  categories: { name_en: "Bio", name_es: "Bio", theme_id: "t1" },
};

const SAMPLE_PROPOSAL = {
  id: "tp1",
  submitted_by: "u1",
  title_en: "Genetics",
  title_es: "Genética",
  description_en: "Study of genes",
  description_es: "Estudio de los genes",
  sample_questions: [],
  status: "pending",
  admin_notes: null,
  created_at: "2026-01-01T00:00:00Z",
  reviewed_at: null,
  reviewed_by: null,
};

// ─── learn_list_feedback ───────────────────────────────────────────
describe("handleListFeedback", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns feedback with defaults", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [SAMPLE_FEEDBACK], error: null })
    );
    const result = await handleListFeedback(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.feedback).toEqual([SAMPLE_FEEDBACK]);
    expect(mock.from).toHaveBeenCalledWith("feedback");
  });

  it("filters by type", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    const result = await handleListFeedback(mock as any, { type: "feature" });
    const json = extractJson(result) as any;
    expect(json.feedback).toEqual([]);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleListFeedback(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("applies limit", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    await handleListFeedback(mock as any, { limit: 10 });
    expect(mock.from).toHaveBeenCalledWith("feedback");
  });
});

// ─── learn_delete_feedback ─────────────────────────────────────────
describe("handleDeleteFeedback", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("deletes feedback by id", async () => {
    mock.from.mockReturnValue(chainable({ data: null, error: null }));
    const result = await handleDeleteFeedback(mock as any, { feedback_id: "f1" });
    expect(extractText(result)).toContain("Deleted");
    expect(mock.from).toHaveBeenCalledWith("feedback");
  });

  it("returns error on delete failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "not found" } })
    );
    const result = await handleDeleteFeedback(mock as any, { feedback_id: "f1" });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_list_proposed_questions ─────────────────────────────────
describe("handleListProposedQuestions", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns proposed questions with defaults", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [SAMPLE_PROPOSED_Q], error: null })
    );
    const result = await handleListProposedQuestions(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.proposed_questions).toEqual([SAMPLE_PROPOSED_Q]);
  });

  it("filters by status", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    await handleListProposedQuestions(mock as any, { status: "approved" });
    expect(mock.from).toHaveBeenCalledWith("proposed_questions");
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleListProposedQuestions(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_review_proposed_question ────────────────────────────────
describe("handleReviewProposedQuestion", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("approves a proposed question", async () => {
    mock.from.mockReturnValue(
      chainable({ data: { ...SAMPLE_PROPOSED_Q, status: "approved" }, error: null })
    );
    const result = await handleReviewProposedQuestion(mock as any, {
      proposed_question_id: "pq1",
      action: "approve",
    });
    const json = extractJson(result) as any;
    expect(json.status).toBe("approved");
  });

  it("rejects a proposed question with notes", async () => {
    mock.from.mockReturnValue(
      chainable({ data: { ...SAMPLE_PROPOSED_Q, status: "rejected", admin_notes: "Low quality" }, error: null })
    );
    const result = await handleReviewProposedQuestion(mock as any, {
      proposed_question_id: "pq1",
      action: "reject",
      admin_notes: "Low quality",
    });
    const json = extractJson(result) as any;
    expect(json.status).toBe("rejected");
  });

  it("approves and promotes to real question", async () => {
    let callNum = 0;
    mock.from.mockImplementation(() => {
      callNum++;
      if (callNum === 1) {
        // update proposed_questions
        return chainable({
          data: {
            ...SAMPLE_PROPOSED_Q,
            status: "approved",
          },
          error: null,
        });
      }
      // insert into questions
      return chainable({ data: { id: "new-q1" }, error: null });
    });
    const result = await handleReviewProposedQuestion(mock as any, {
      proposed_question_id: "pq1",
      action: "approve",
      promote: true,
    });
    const json = extractJson(result) as any;
    expect(json.status).toBe("approved");
    expect(json.promoted).toBe(true);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleReviewProposedQuestion(mock as any, {
      proposed_question_id: "pq1",
      action: "approve",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_list_theme_proposals ────────────────────────────────────
describe("handleListThemeProposals", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns theme proposals with defaults", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [SAMPLE_PROPOSAL], error: null })
    );
    const result = await handleListThemeProposals(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.proposals).toEqual([SAMPLE_PROPOSAL]);
  });

  it("filters by status", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    await handleListThemeProposals(mock as any, { status: "rejected" });
    expect(mock.from).toHaveBeenCalledWith("theme_proposals");
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleListThemeProposals(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_review_theme_proposal ───────────────────────────────────
describe("handleReviewThemeProposal", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("approves a theme proposal", async () => {
    mock.from.mockReturnValue(
      chainable({ data: { ...SAMPLE_PROPOSAL, status: "approved" }, error: null })
    );
    const result = await handleReviewThemeProposal(mock as any, {
      theme_proposal_id: "tp1",
      action: "approve",
    });
    const json = extractJson(result) as any;
    expect(json.status).toBe("approved");
  });

  it("rejects a theme proposal with notes", async () => {
    mock.from.mockReturnValue(
      chainable({ data: { ...SAMPLE_PROPOSAL, status: "rejected", admin_notes: "Duplicate" }, error: null })
    );
    const result = await handleReviewThemeProposal(mock as any, {
      theme_proposal_id: "tp1",
      action: "reject",
      admin_notes: "Duplicate",
    });
    const json = extractJson(result) as any;
    expect(json.status).toBe("rejected");
  });

  it("approves and creates topic", async () => {
    let callNum = 0;
    mock.from.mockImplementation(() => {
      callNum++;
      if (callNum === 1) {
        return chainable({ data: { ...SAMPLE_PROPOSAL, status: "approved" }, error: null });
      }
      return chainable({ data: { id: "new-t1", title_en: "Genetics" }, error: null });
    });
    const result = await handleReviewThemeProposal(mock as any, {
      theme_proposal_id: "tp1",
      action: "approve",
      create_topic: true,
    });
    const json = extractJson(result) as any;
    expect(json.status).toBe("approved");
    expect(json.created_topic).toBeDefined();
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleReviewThemeProposal(mock as any, {
      theme_proposal_id: "tp1",
      action: "approve",
    });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});
