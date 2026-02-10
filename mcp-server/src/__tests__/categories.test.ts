import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainable, createMockSupabase, extractJson, extractText } from "../test-helpers.js";

vi.mock("../supabase.js", () => ({ getSupabaseClient: vi.fn() }));

import {
  handleListCategories,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
  handleMoveCategory,
} from "../tools/categories.js";

function mockSupabase() {
  return createMockSupabase();
}

/* ────────────────────── learn_list_categories ────────────────────── */

describe("handleListCategories", () => {
  it("returns categories with question counts", async () => {
    const sb = mockSupabase();
    const cats = [
      { id: "c1", topic_id: "t1", name_en: "Cells", name_es: "Células", slug: "cells" },
      { id: "c2", topic_id: "t1", name_en: "DNA", name_es: "ADN", slug: "dna" },
    ];
    sb.from.mockReturnValueOnce(chainable({ data: cats, error: null, count: 2 }));
    sb.from.mockReturnValueOnce(chainable({ data: [{ category_id: "c1", count: 10 }, { category_id: "c2", count: 5 }], error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [{ category_id: "c1", count: 3 }, { category_id: "c2", count: 2 }], error: null }));

    const result = await handleListCategories(sb as any, {});
    const json = extractJson(result) as any;
    expect(json.categories).toHaveLength(2);
    expect(json.categories[0].question_count).toBe(10);
    expect(json.total).toBe(2);
  });

  it("filters by topic_id", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: [{ id: "c1", topic_id: "t1", name_en: "X", name_es: "Y", slug: "x" }], error: null, count: 1 }));
    sb.from.mockReturnValueOnce(chainable({ data: [{ category_id: "c1", count: 3 }], error: null }));
    sb.from.mockReturnValueOnce(chainable({ data: [{ category_id: "c1", count: 1 }], error: null }));

    const result = await handleListCategories(sb as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.categories).toHaveLength(1);
  });

  it("returns error on DB failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "timeout" } }));

    const result = await handleListCategories(sb as any, {});
    expect((result as any).isError).toBe(true);
  });

  it("handles empty results", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null, count: 0 }));
    sb.from.mockReturnValueOnce(chainable({ data: [], error: null }));

    const result = await handleListCategories(sb as any, { topic_id: "t1" });
    const json = extractJson(result) as any;
    expect(json.categories).toEqual([]);
  });
});

/* ────────────────────── learn_create_category ────────────────────── */

describe("handleCreateCategory", () => {
  it("creates a category with required fields", async () => {
    const sb = mockSupabase();
    const created = { id: "c-new", topic_id: "t1", name_en: "Genetics", name_es: "Genética", slug: "genetics" };
    sb.from.mockReturnValueOnce(chainable({ data: created, error: null }));

    const result = await handleCreateCategory(sb as any, {
      topic_id: "t1", name_en: "Genetics", name_es: "Genética", slug: "genetics",
    });
    const json = extractJson(result) as any;
    expect(json.id).toBe("c-new");
    expect(json.name_en).toBe("Genetics");
  });

  it("creates a category with optional color", async () => {
    const sb = mockSupabase();
    const created = { id: "c-new", topic_id: "t1", name_en: "X", name_es: "Y", slug: "x", color: "#abc" };
    sb.from.mockReturnValueOnce(chainable({ data: created, error: null }));

    const result = await handleCreateCategory(sb as any, {
      topic_id: "t1", name_en: "X", name_es: "Y", slug: "x", color: "#abc",
    });
    const json = extractJson(result) as any;
    expect(json.color).toBe("#abc");
  });

  it("returns error on insert failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "FK violation" } }));

    const result = await handleCreateCategory(sb as any, {
      topic_id: "bad-id", name_en: "X", name_es: "Y", slug: "x",
    });
    expect((result as any).isError).toBe(true);
  });
});

/* ────────────────────── learn_update_category ────────────────────── */

describe("handleUpdateCategory", () => {
  it("updates specified fields", async () => {
    const sb = mockSupabase();
    const updated = { id: "c1", name_en: "Updated", name_es: "Actualizado", slug: "updated" };
    sb.from.mockReturnValueOnce(chainable({ data: updated, error: null }));

    const result = await handleUpdateCategory(sb as any, { category_id: "c1", name_en: "Updated" });
    const json = extractJson(result) as any;
    expect(json.name_en).toBe("Updated");
  });

  it("returns error on failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "not found" } }));

    const result = await handleUpdateCategory(sb as any, { category_id: "c1", name_en: "X" });
    expect((result as any).isError).toBe(true);
  });

  it("handles no fields to update", async () => {
    const sb = mockSupabase();
    const result = await handleUpdateCategory(sb as any, { category_id: "c1" });
    expect(extractText(result)).toContain("No fields");
    expect((result as any).isError).toBe(true);
  });
});

/* ────────────────────── learn_delete_category ────────────────────── */

describe("handleDeleteCategory", () => {
  it("deletes when confirm matches", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: null }));

    const result = await handleDeleteCategory(sb as any, { category_id: "c1", confirm: "DELETE" });
    expect(extractText(result)).toContain("deleted");
  });

  it("rejects when confirm does not match", async () => {
    const sb = mockSupabase();
    const result = await handleDeleteCategory(sb as any, { category_id: "c1", confirm: "wrong" });
    expect((result as any).isError).toBe(true);
    expect(extractText(result)).toContain("DELETE");
  });

  it("returns error on DB failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "constraint" } }));

    const result = await handleDeleteCategory(sb as any, { category_id: "c1", confirm: "DELETE" });
    expect((result as any).isError).toBe(true);
  });
});

/* ────────────────────── learn_move_category ────────────────────── */

describe("handleMoveCategory", () => {
  it("moves category to new topic", async () => {
    const sb = mockSupabase();
    const updated = { id: "c1", topic_id: "t2" };
    sb.from.mockReturnValueOnce(chainable({ data: updated, error: null }));

    const result = await handleMoveCategory(sb as any, { category_id: "c1", new_topic_id: "t2" });
    const json = extractJson(result) as any;
    expect(json.topic_id).toBe("t2");
  });

  it("returns error on failure", async () => {
    const sb = mockSupabase();
    sb.from.mockReturnValueOnce(chainable({ data: null, error: { message: "invalid FK" } }));

    const result = await handleMoveCategory(sb as any, { category_id: "c1", new_topic_id: "bad" });
    expect((result as any).isError).toBe(true);
  });
});
