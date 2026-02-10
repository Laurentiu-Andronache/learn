import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainable, createMockSupabase, extractJson, extractText } from "../test-helpers.js";

vi.mock("../supabase.js", () => ({ getSupabaseClient: vi.fn() }));

import {
  handleListTopics,
  handleGetTopic,
  handleCreateTopic,
  handleUpdateTopic,
  handleDeleteTopic,
  handleHardDeleteTopic,
} from "../tools/topics.js";

function mockSupabase() {
  return createMockSupabase();
}

/* ────────────────────── learn_list_topics ────────────────────── */

describe("handleListTopics", () => {
  it("returns topics with category and question counts", async () => {
    const sb = mockSupabase();
    const topics = [
      { id: "t1", title_en: "Biology", title_es: "Biología", is_active: true, created_at: "2025-01-01" },
      { id: "t2", title_en: "Chemistry", title_es: "Química", is_active: true, created_at: "2025-01-02" },
    ];
    sb.from.mockReturnValueOnce(chainable({ data: topics, error: null, count: 2 }));
    // category counts
    sb.from.mockReturnValueOnce(chainable({ data: [{ topic_id: "t1", count: 3 }, { topic_id: "t2", count: 1 }], error: null }));
    // question counts
    sb.from.mockReturnValueOnce(chainable({ data: [{ topic_id: "t1", count: 20 }, { topic_id: "t2", count: 5 }], error: null }));
    // flashcard counts
    sb.from.mockReturnValueOnce(chainable({ data: [{ topic_id: "t1", count: 15 }, { topic_id: "t2", count: 8 }], error: null }));

    const result = await handleListTopics(sb as any, {});
    const json = extractJson(result) as any;
    expect(json.topics).toHaveLength(2);
    expect(json.topics[0].category_count).toBe(3);
    expect(json.topics[0].question_count).toBe(20);
    expect(json.total).toBe(2);
  });

  it("filters by is_active", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null, count: 0 }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null }));

    const result = await handleListTopics(sb as any, { is_active: false });
    const json = extractJson(result) as any;
    expect(json.topics).toHaveLength(0);
  });

  it("returns error on DB failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "connection refused" } }));

    const result = await handleListTopics(sb as any, {});
    expect(extractText(result)).toContain("Error");
    expect((result as any).isError).toBe(true);
  });

  it("handles empty results", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null, count: 0 }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null }));

    const result = await handleListTopics(sb as any, { limit: 10, offset: 0 });
    const json = extractJson(result) as any;
    expect(json.topics).toEqual([]);
    expect(json.total).toBe(0);
  });
});

/* ────────────────────── learn_get_topic ────────────────────── */

describe("handleGetTopic", () => {
  it("returns full topic with categories and question counts", async () => {
    const sb = mockSupabase();
    const topic = { id: "t1", title_en: "Bio", title_es: "Bio", is_active: true };
    const cats = [
      { id: "c1", topic_id: "t1", name_en: "Cells", name_es: "Células", slug: "cells" },
      { id: "c2", topic_id: "t1", name_en: "DNA", name_es: "ADN", slug: "dna" },
    ];
    sb.from.mockReturnValueOnce(chainable({ data: topic, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: cats, error: null }));
    // question counts per category
    sb.from.mockReturnValueOnce(chainable({ data: [{ category_id: "c1", count: 10 }, { category_id: "c2", count: 5 }], error: null }));
    // flashcard counts per category
    sb.from.mockReturnValueOnce(chainable({ data: [{ category_id: "c1", count: 4 }, { category_id: "c2", count: 2 }], error: null }));

    const result = await handleGetTopic(sb as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.id).toBe("t1");
    expect(json.categories).toHaveLength(2);
    expect(json.categories[0].question_count).toBe(10);
  });

  it("returns error when topic not found", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "not found", code: "PGRST116" } }));

    const result = await handleGetTopic(sb as any, { topic_id: "nonexistent" });
    expect(extractText(result)).toContain("Error");
    expect((result as any).isError).toBe(true);
  });

  it("handles topic with no categories", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: { id: "t1", title_en: "Empty" }, error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null }));

    const result = await handleGetTopic(sb as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.categories).toEqual([]);
  });
});

/* ────────────────────── learn_create_topic ────────────────────── */

describe("handleCreateTopic", () => {
  it("creates a topic with required fields", async () => {
    const sb = mockSupabase();
    const created = { id: "new-id", title_en: "Physics", title_es: "Física", is_active: true };
    sb.from.mockReturnValueOnce(chainable({ data: created, error: null }));

    const result = await handleCreateTopic(sb as any, { title_en: "Physics", title_es: "Física" });
    const json = extractJson(result) as any;
    expect(json.id).toBe("new-id");
    expect(json.title_en).toBe("Physics");
  });

  it("creates a topic with all optional fields", async () => {
    const sb = mockSupabase();
    const created = {
      id: "new-id", title_en: "Physics", title_es: "Física",
      description_en: "desc", icon: "🔬", color: "#ff0000",
    };
    sb.from.mockReturnValueOnce(chainable({ data: created, error: null }));

    const result = await handleCreateTopic(sb as any, {
      title_en: "Physics", title_es: "Física",
      description_en: "desc", icon: "🔬", color: "#ff0000",
    });
    const json = extractJson(result) as any;
    expect(json.icon).toBe("🔬");
  });

  it("returns error on insert failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "duplicate key" } }));

    const result = await handleCreateTopic(sb as any, { title_en: "Physics", title_es: "Física" });
    expect(extractText(result)).toContain("Error");
    expect((result as any).isError).toBe(true);
  });
});

/* ────────────────────── learn_update_topic ────────────────────── */

describe("handleUpdateTopic", () => {
  it("updates specified fields only", async () => {
    const sb = mockSupabase();
    const updated = { id: "t1", title_en: "Updated", title_es: "Actualizado" };
    sb.from.mockReturnValueOnce(chainable({ data: updated, error: null }));

    const result = await handleUpdateTopic(sb as any, { topic_id: "t1", title_en: "Updated" });
    const json = extractJson(result) as any;
    expect(json.title_en).toBe("Updated");
  });

  it("returns error on update failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "not found" } }));

    const result = await handleUpdateTopic(sb as any, { topic_id: "t1", title_en: "X" });
    expect((result as any).isError).toBe(true);
  });

  it("handles updating all optional fields", async () => {
    const sb = mockSupabase();
    const updated = {
      id: "t1", title_en: "A", title_es: "B", description_en: "C",
      description_es: "D", icon: "X", color: "#000", intro_text_en: "E", intro_text_es: "F",
    };
    sb.from.mockReturnValueOnce(chainable({ data: updated, error: null }));

    const result = await handleUpdateTopic(sb as any, {
      topic_id: "t1", title_en: "A", title_es: "B", description_en: "C",
      description_es: "D", icon: "X", color: "#000", intro_text_en: "E", intro_text_es: "F",
    });
    const json = extractJson(result) as any;
    expect(json.intro_text_en).toBe("E");
  });
});

/* ────────────────────── learn_delete_topic ────────────────────── */

describe("handleDeleteTopic", () => {
  it("soft deletes by setting is_active=false", async () => {
    const sb = mockSupabase();
    const updated = { id: "t1", is_active: false };
    sb.from.mockReturnValueOnce(chainable({ data: updated, error: null }));

    const result = await handleDeleteTopic(sb as any, { topic_id: "t1" });
    expect(extractText(result)).toContain("deactivated");
  });

  it("returns error on failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "not found" } }));

    const result = await handleDeleteTopic(sb as any, { topic_id: "t1" });
    expect((result as any).isError).toBe(true);
  });
});

/* ────────────────────── learn_hard_delete_topic ────────────────────── */

describe("handleHardDeleteTopic", () => {
  it("permanently deletes when confirm matches", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: null }));

    const result = await handleHardDeleteTopic(sb as any, { topic_id: "t1", confirm: "PERMANENTLY DELETE" });
    expect(extractText(result)).toContain("permanently deleted");
  });

  it("rejects when confirm does not match", async () => {
    const sb = mockSupabase();
    const result = await handleHardDeleteTopic(sb as any, { topic_id: "t1", confirm: "wrong" });
    expect(extractText(result)).toContain("PERMANENTLY DELETE");
    expect((result as any).isError).toBe(true);
  });

  it("returns error on DB failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "FK constraint" } }));

    const result = await handleHardDeleteTopic(sb as any, { topic_id: "t1", confirm: "PERMANENTLY DELETE" });
    expect((result as any).isError).toBe(true);
  });
});
