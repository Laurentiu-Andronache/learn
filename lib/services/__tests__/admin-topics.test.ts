import { beforeEach, describe, expect, it, vi } from "vitest";

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
  const self = (): unknown =>
    new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === "then") {
            return (resolve: (v: unknown) => void) => resolve(finalResult);
          }
          return vi.fn(() => self());
        },
      },
    );
  return self();
}

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/server";
import {
  createTopic,
  getAllTopics,
  getTopicById,
  restoreTopic,
  softDeleteTopic,
  toggleTopicVisibility,
  updateTopic,
  updateTopicIntroText,
} from "../admin-topics";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createTopic ────────────────────────────────────────────────────

describe("createTopic", () => {
  const formData = {
    title_en: "Test Topic",
    title_es: "Tema de prueba",
    description_en: null,
    description_es: null,
    slug: "test-topic",
    icon: null,
    color: null,
    intro_text_en: null,
    intro_text_es: null,
    is_active: true,
  };

  it("inserts topic with creator_id and returns id", async () => {
    const insertMock = vi.fn();
    const selectMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ insert: insertMock });
    insertMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({
      data: { id: "topic-1" },
      error: null,
    });

    const id = await createTopic(formData);

    expect(id).toBe("topic-1");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title_en: "Test Topic",
        creator_id: "admin-uuid",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/topics");
  });

  it("throws on auth failure", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Forbidden"));
    await expect(createTopic(formData)).rejects.toThrow("Forbidden");
  });

  it("throws on DB error", async () => {
    mockSupabase.from.mockReturnValue(
      chainable({ data: null, error: { message: "Unique constraint" } }),
    );

    await expect(createTopic(formData)).rejects.toThrow("Unique constraint");
  });
});

// ─── updateTopic ────────────────────────────────────────────────────

describe("updateTopic", () => {
  const formData = {
    title_en: "Updated",
    title_es: "Actualizado",
    description_en: null,
    description_es: null,
    slug: "updated",
    icon: null,
    color: null,
    intro_text_en: null,
    intro_text_es: null,
    is_active: true,
  };

  it("updates topic by id and revalidates", async () => {
    const updateMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ update: updateMock });
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await updateTopic("topic-1", formData);

    expect(mockSupabase.from).toHaveBeenCalledWith("topics");
    expect(updateMock).toHaveBeenCalledWith(formData);
    expect(eqMock).toHaveBeenCalledWith("id", "topic-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/topics");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/topics/topic-1/edit");
  });

  it("throws on DB error", async () => {
    const updateMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ update: updateMock });
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: { message: "Not found" } });

    await expect(updateTopic("bad-id", formData)).rejects.toThrow("Not found");
  });
});

// ─── softDeleteTopic ────────────────────────────────────────────────

describe("softDeleteTopic", () => {
  it("sets is_active to false", async () => {
    const updateMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ update: updateMock });
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await softDeleteTopic("topic-1");

    expect(updateMock).toHaveBeenCalledWith({ is_active: false });
    expect(eqMock).toHaveBeenCalledWith("id", "topic-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/topics");
  });
});

// ─── restoreTopic ───────────────────────────────────────────────────

describe("restoreTopic", () => {
  it("sets is_active to true", async () => {
    const updateMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ update: updateMock });
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await restoreTopic("topic-1");

    expect(updateMock).toHaveBeenCalledWith({ is_active: true });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/topics");
  });
});

// ─── getTopicById ───────────────────────────────────────────────────

describe("getTopicById", () => {
  it("returns topic with creator join", async () => {
    const mockData = {
      id: "topic-1",
      title_en: "Topic",
      creator: { display_name: "Admin" },
    };

    mockSupabase.from.mockReturnValue(
      chainable({ data: mockData, error: null }),
    );

    const result = await getTopicById("topic-1");
    expect(result).toEqual(mockData);
    expect(mockSupabase.from).toHaveBeenCalledWith("topics");
  });

  it("throws on DB error", async () => {
    mockSupabase.from.mockReturnValue(
      chainable({ data: null, error: { message: "No rows" } }),
    );

    await expect(getTopicById("bad-id")).rejects.toThrow("No rows");
  });
});

// ─── updateTopicIntroText ───────────────────────────────────────────

describe("updateTopicIntroText", () => {
  it("updates intro text and revalidates multiple paths", async () => {
    const updateMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ update: updateMock });
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await updateTopicIntroText("topic-1", "English intro", "Spanish intro");

    expect(updateMock).toHaveBeenCalledWith({
      intro_text_en: "English intro",
      intro_text_es: "Spanish intro",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/topics");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/topics/topic-1/edit");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/admin/reviews/content-issues",
    );
  });
});

// ─── toggleTopicVisibility ──────────────────────────────────────────

describe("toggleTopicVisibility", () => {
  it("sets visibility to private", async () => {
    const updateMock = vi.fn();
    const eqMock = vi.fn();
    mockSupabase.from.mockReturnValue({ update: updateMock });
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockResolvedValue({ error: null });

    await toggleTopicVisibility("topic-1", "private");

    expect(updateMock).toHaveBeenCalledWith({ visibility: "private" });
    expect(eqMock).toHaveBeenCalledWith("id", "topic-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/topics");
  });
});

// ─── getAllTopics ────────────────────────────────────────────────────

describe("getAllTopics", () => {
  it("returns all topics ordered by created_at desc", async () => {
    const mockData = [
      { id: "t1", title_en: "Topic 1" },
      { id: "t2", title_en: "Topic 2" },
    ];
    mockSupabase.from.mockReturnValue(
      chainable({ data: mockData, error: null }),
    );

    const result = await getAllTopics();
    expect(result).toEqual(mockData);
    expect(mockSupabase.from).toHaveBeenCalledWith("topics");
  });

  it("throws on DB error", async () => {
    mockSupabase.from.mockReturnValue(
      chainable({ data: null, error: { message: "Connection failed" } }),
    );

    await expect(getAllTopics()).rejects.toThrow("Connection failed");
  });
});
