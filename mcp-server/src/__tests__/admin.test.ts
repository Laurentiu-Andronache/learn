import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  createMockSupabase,
  extractJson,
  extractText,
} from "../test-helpers.js";
import {
  handleAdminSummary,
  handleSchemaInfo,
  handleRunQuery,
} from "../tools/admin.js";

function mockSupabase() {
  return createMockSupabase();
}

// ─── learn_admin_summary ───────────────────────────────────────────
describe("handleAdminSummary", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns summary with all counts", async () => {
    mock.from.mockImplementation((table: string) => {
      if (table === "feedback") {
        return chainable({ data: [], error: null, count: 3 });
      }
      if (table === "proposed_questions") {
        return chainable({ data: [], error: null, count: 2 });
      }
      if (table === "topic_proposals") {
        return chainable({ data: [], error: null, count: 1 });
      }
      if (table === "topics") {
        return chainable({ data: [{ id: "t1" }], error: null, count: 5 });
      }
      if (table === "categories") {
        return chainable({ data: [], error: null, count: 10 });
      }
      if (table === "questions") {
        return chainable({
          data: [{ id: "q1", updated_at: "2026-01-01" }],
          error: null,
          count: 100,
        });
      }
      return chainable({ data: [], error: null, count: 0 });
    });
    const result = await handleAdminSummary(mock as any);
    const json = extractJson(result) as any;
    expect(json.pending_feedback).toBeDefined();
    expect(json.pending_proposed_questions).toBeDefined();
    expect(json.pending_topic_proposals).toBeDefined();
    expect(json.totals).toBeDefined();
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleAdminSummary(mock as any);
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("handles zero counts", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null, count: 0 })
    );
    const result = await handleAdminSummary(mock as any);
    const json = extractJson(result) as any;
    expect(json.totals.topics).toBe(0);
    expect(json.totals.categories).toBe(0);
    expect(json.totals.questions).toBe(0);
  });
});

// ─── learn_schema_info ─────────────────────────────────────────────
describe("handleSchemaInfo", () => {
  it("returns all tables when no table_name given", async () => {
    const result = await handleSchemaInfo({});
    const json = extractJson(result) as any;
    expect(json.tables).toBeDefined();
    expect(Array.isArray(json.tables)).toBe(true);
    expect(json.tables.length).toBeGreaterThan(0);
  });

  it("returns detailed info for a specific table", async () => {
    const result = await handleSchemaInfo({ table_name: "topics" });
    const json = extractJson(result) as any;
    expect(json.table).toBe("topics");
    expect(json.columns).toBeDefined();
    expect(json.columns.length).toBeGreaterThan(0);
  });

  it("returns error for unknown table", async () => {
    const result = await handleSchemaInfo({ table_name: "nonexistent" });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("includes column types in detailed view", async () => {
    const result = await handleSchemaInfo({ table_name: "questions" });
    const json = extractJson(result) as any;
    const idCol = json.columns.find((c: any) => c.name === "id");
    expect(idCol).toBeDefined();
    expect(idCol.type).toBeDefined();
  });

  it("returns info for all known tables", async () => {
    const knownTables = [
      "topics", "categories", "questions", "profiles", "admin_users",
      "user_card_state", "review_logs", "feedback", "question_reports",
      "proposed_questions", "topic_proposals",
    ];
    for (const table of knownTables) {
      const result = await handleSchemaInfo({ table_name: table });
      const json = extractJson(result) as any;
      expect(json.table).toBe(table);
    }
  });
});

// ─── learn_run_query ───────────────────────────────────────────────
describe("handleRunQuery", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("runs basic query", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [{ id: "t1", title_en: "Science" }], error: null })
    );
    const result = await handleRunQuery(mock as any, { table: "topics" });
    const json = extractJson(result) as any;
    expect(json.data).toEqual([{ id: "t1", title_en: "Science" }]);
  });

  it("applies select columns", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [{ id: "t1" }], error: null })
    );
    await handleRunQuery(mock as any, { table: "topics", select: "id" });
    expect(mock.from).toHaveBeenCalledWith("topics");
  });

  it("applies filters", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    await handleRunQuery(mock as any, {
      table: "questions",
      filters: [{ column: "difficulty", op: "gte", value: 5 }],
    });
    expect(mock.from).toHaveBeenCalledWith("questions");
  });

  it("applies order and limit", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    await handleRunQuery(mock as any, {
      table: "topics",
      order: { column: "created_at", ascending: false },
      limit: 10,
    });
    expect(mock.from).toHaveBeenCalledWith("topics");
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleRunQuery(mock as any, { table: "topics" });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("applies multiple filters", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    await handleRunQuery(mock as any, {
      table: "questions",
      filters: [
        { column: "difficulty", op: "gte", value: 3 },
        { column: "type", op: "eq", value: "true_false" },
      ],
    });
    expect(mock.from).toHaveBeenCalledWith("questions");
  });
});
