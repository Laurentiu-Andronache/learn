import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase server client
const mockUser = { id: "admin-uuid", email: "admin@test.com" };
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  requireAdmin: vi.fn(() =>
    Promise.resolve({ supabase: mockSupabase, user: mockUser }),
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Helper to create chainable query mock
function chainable(finalResult: { data?: unknown; error?: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = () =>
    new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === "then") {
            // Make it thenable — resolves to finalResult
            return (resolve: (v: unknown) => void) => resolve(finalResult);
          }
          if (!chain[prop]) {
            chain[prop] = vi.fn(() => self());
          }
          return chain[prop];
        },
      },
    );
  return self();
}

import {
  deleteFeedback,
  deleteProposedQuestion,
  deleteQuestion,
  deleteThemeProposal,
  getCategoriesList,
  getFeedbackList,
  getProposedQuestionsList,
  getQuestionsList,
  getThemeProposalsList,
  getThemesList,
  updateProposedQuestionStatus,
  updateThemeProposalStatus,
} from "../admin-reviews";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getFeedbackList ────────────────────────────────────────────────

describe("getFeedbackList", () => {
  it("returns all feedback ordered by created_at desc", async () => {
    const mockData = [
      { id: "1", type: "bug", message: "Crash" },
      { id: "2", type: "feature", message: "Dark mode" },
    ];
    mockSupabase.from.mockReturnValue(
      chainable({ data: mockData, error: null }),
    );

    const result = await getFeedbackList();
    expect(mockSupabase.from).toHaveBeenCalledWith("feedback");
    expect(result).toEqual(mockData);
  });

  it("filters by type when provided", async () => {
    const mockData = [{ id: "1", type: "bug", message: "Crash" }];
    const selectMock = vi.fn();
    const orderMock = vi.fn();
    const eqMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ data: mockData, error: null });

    const result = await getFeedbackList("bug");
    expect(eqMock).toHaveBeenCalledWith("type", "bug");
    expect(result).toEqual(mockData);
  });

  it("throws on supabase error", async () => {
    mockSupabase.from.mockReturnValue(
      chainable({ data: null, error: { message: "DB error" } }),
    );

    await expect(getFeedbackList()).rejects.toThrow("DB error");
  });
});

// ─── updateProposedQuestionStatus ───────────────────────────────────

describe("updateProposedQuestionStatus", () => {
  it("updates proposed question with admin notes", async () => {
    const updateMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ update: updateMock });
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await updateProposedQuestionStatus("pq-1", "approved", "Good question");

    expect(mockSupabase.from).toHaveBeenCalledWith("proposed_questions");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        admin_notes: "Good question",
        reviewed_by: "admin-uuid",
      }),
    );
  });
});

// ─── updateThemeProposalStatus ──────────────────────────────────────

describe("updateThemeProposalStatus", () => {
  it("updates theme proposal status", async () => {
    const updateMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ update: updateMock });
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await updateThemeProposalStatus("tp-1", "rejected", "Not relevant");

    expect(mockSupabase.from).toHaveBeenCalledWith("theme_proposals");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "rejected",
        admin_notes: "Not relevant",
        reviewed_by: "admin-uuid",
      }),
    );
  });
});

// ─── getProposedQuestionsList ───────────────────────────────────────

describe("getProposedQuestionsList", () => {
  it("returns proposed questions with category join", async () => {
    const mockData = [
      { id: "1", category: { name_en: "Cat1", name_es: "Cat1Es" } },
    ];
    mockSupabase.from.mockReturnValue(
      chainable({ data: mockData, error: null }),
    );

    const result = await getProposedQuestionsList();
    expect(mockSupabase.from).toHaveBeenCalledWith("proposed_questions");
    expect(result).toEqual(mockData);
  });
});

// ─── getThemeProposalsList ──────────────────────────────────────────

describe("getThemeProposalsList", () => {
  it("returns theme proposals", async () => {
    const mockData = [{ id: "1", title_en: "New Topic" }];
    mockSupabase.from.mockReturnValue(
      chainable({ data: mockData, error: null }),
    );

    const result = await getThemeProposalsList();
    expect(mockSupabase.from).toHaveBeenCalledWith("theme_proposals");
    expect(result).toEqual(mockData);
  });
});

// ─── getQuestionsList ───────────────────────────────────────────────

describe("getQuestionsList", () => {
  it("returns questions with nested category/theme join", async () => {
    const mockData = [
      {
        id: "q1",
        category: {
          id: "c1",
          name_en: "Cat",
          theme_id: "t1",
          theme: { id: "t1", title_en: "Topic" },
        },
      },
    ];
    mockSupabase.from.mockReturnValue(
      chainable({ data: mockData, error: null }),
    );

    const result = await getQuestionsList();
    expect(result).toEqual(mockData);
  });

  it("filters by themeId at DB level via !inner join", async () => {
    const mockData = [{ id: "q1", category: { theme_id: "t1" } }];
    mockSupabase.from.mockReturnValue(
      chainable({ data: mockData, error: null }),
    );

    const result = await getQuestionsList({ themeId: "t1" });
    expect(result).toEqual(mockData);
  });
});

// ─── Delete functions ───────────────────────────────────────────────

describe("deleteQuestion", () => {
  it("deletes by id and revalidates", async () => {
    const deleteMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ delete: deleteMock });
    deleteMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await deleteQuestion("q-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("questions");
    expect(eqMock).toHaveBeenCalledWith("id", "q-1");
  });

  it("throws on error", async () => {
    const deleteMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ delete: deleteMock });
    deleteMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: { message: "FK constraint" } });

    await expect(deleteQuestion("q-bad")).rejects.toThrow("FK constraint");
  });
});

describe("deleteFeedback", () => {
  it("deletes feedback and revalidates multiple paths", async () => {
    const deleteMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ delete: deleteMock });
    deleteMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await deleteFeedback("f-1");
    expect(mockSupabase.from).toHaveBeenCalledWith("feedback");
  });
});

describe("deleteProposedQuestion", () => {
  it("deletes proposed question", async () => {
    const deleteMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ delete: deleteMock });
    deleteMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await deleteProposedQuestion("pq-1");
    expect(mockSupabase.from).toHaveBeenCalledWith("proposed_questions");
  });
});

describe("deleteThemeProposal", () => {
  it("deletes theme proposal", async () => {
    const deleteMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ delete: deleteMock });
    deleteMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await deleteThemeProposal("tp-1");
    expect(mockSupabase.from).toHaveBeenCalledWith("theme_proposals");
  });
});

// ─── Lookup lists ───────────────────────────────────────────────────

describe("getThemesList", () => {
  it("returns active themes", async () => {
    const mockData = [{ id: "t1", title_en: "Topic 1" }];
    mockSupabase.from.mockReturnValue(
      chainable({ data: mockData, error: null }),
    );

    const result = await getThemesList();
    expect(result).toEqual(mockData);
  });
});

describe("getCategoriesList", () => {
  it("returns all categories", async () => {
    const mockData = [{ id: "c1", name_en: "Cat 1", theme_id: "t1" }];
    mockSupabase.from.mockReturnValue(
      chainable({ data: mockData, error: null }),
    );

    const result = await getCategoriesList();
    expect(result).toEqual(mockData);
  });
});
