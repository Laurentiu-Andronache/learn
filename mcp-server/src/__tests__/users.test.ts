import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  createMockSupabase,
  extractJson,
  extractText,
} from "../test-helpers.js";
import {
  handleListUsers,
  handleGetUser,
  handleActiveUsers,
  handleUserTopics,
} from "../tools/users.js";

function mockSupabase() {
  return createMockSupabase();
}

const SAMPLE_PROFILE = {
  id: "u1",
  display_name: "Alice",
  preferred_language: "en",
  is_anonymous: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// ─── learn_list_users ──────────────────────────────────────────────
describe("handleListUsers", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns users with defaults", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [SAMPLE_PROFILE], error: null, count: 1 })
    );
    const result = await handleListUsers(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.users).toEqual([SAMPLE_PROFILE]);
    expect(json.total).toBe(1);
  });

  it("filters by search term", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [SAMPLE_PROFILE], error: null, count: 1 })
    );
    const result = await handleListUsers(mock as any, { search: "Alice" });
    const json = extractJson(result) as any;
    expect(json.users).toHaveLength(1);
  });

  it("applies limit and offset", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null, count: 0 })
    );
    await handleListUsers(mock as any, { limit: 10, offset: 20 });
    expect(mock.from).toHaveBeenCalledWith("profiles");
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleListUsers(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("returns empty array when no users", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null, count: 0 })
    );
    const result = await handleListUsers(mock as any, {});
    const json = extractJson(result) as any;
    expect(json.users).toEqual([]);
    expect(json.total).toBe(0);
  });
});

// ─── learn_get_user ────────────────────────────────────────────────
describe("handleGetUser", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("gets user by user_id", async () => {
    let callNum = 0;
    mock.from.mockImplementation((table: string) => {
      callNum++;
      if (table === "profiles") {
        return chainable({ data: SAMPLE_PROFILE, error: null });
      }
      if (table === "topics") {
        return chainable({ data: [{ id: "t1" }], error: null, count: 1 });
      }
      if (table === "review_logs") {
        return chainable({ data: [], error: null, count: 5 });
      }
      return chainable({ data: null, error: null });
    });
    const result = await handleGetUser(mock as any, { user_id: "u1" });
    const json = extractJson(result) as any;
    expect(json.profile.id).toBe("u1");
  });

  it("gets user by display_name", async () => {
    mock.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return chainable({ data: SAMPLE_PROFILE, error: null });
      }
      if (table === "topics") {
        return chainable({ data: [], error: null, count: 0 });
      }
      if (table === "review_logs") {
        return chainable({ data: [], error: null, count: 0 });
      }
      return chainable({ data: null, error: null });
    });
    const result = await handleGetUser(mock as any, { display_name: "Alice" });
    const json = extractJson(result) as any;
    expect(json.profile.display_name).toBe("Alice");
  });

  it("returns error when neither param provided", async () => {
    const result = await handleGetUser(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("returns error when user not found", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "not found" } })
    );
    const result = await handleGetUser(mock as any, { user_id: "missing" });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_active_users ────────────────────────────────────────────
describe("handleActiveUsers", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns active users since ISO date", async () => {
    mock.from.mockReturnValue(
      chainable({
        data: [
          { user_id: "u1", reviewed_at: "2026-01-15" },
          { user_id: "u1", reviewed_at: "2026-01-16" },
          { user_id: "u2", reviewed_at: "2026-01-15" },
        ],
        error: null,
      })
    );
    const result = await handleActiveUsers(mock as any, { since: "2026-01-01" });
    const json = extractJson(result) as any;
    expect(json.active_user_count).toBe(2);
    expect(json.users).toHaveLength(2);
  });

  it("parses shorthand 24h", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    const result = await handleActiveUsers(mock as any, { since: "24h" });
    const json = extractJson(result) as any;
    expect(json.active_user_count).toBe(0);
  });

  it("parses shorthand 7d", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    const result = await handleActiveUsers(mock as any, { since: "7d" });
    const json = extractJson(result) as any;
    expect(json.active_user_count).toBe(0);
  });

  it("parses shorthand 30d", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    const result = await handleActiveUsers(mock as any, { since: "30d" });
    const json = extractJson(result) as any;
    expect(json.active_user_count).toBe(0);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleActiveUsers(mock as any, { since: "24h" });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });
});

// ─── learn_user_topics ─────────────────────────────────────────────
describe("handleUserTopics", () => {
  let mock: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    mock = mockSupabase();
  });

  it("returns topics created by user_id", async () => {
    mock.from.mockImplementation((table: string) => {
      if (table === "topics") {
        return chainable({
          data: [{ id: "t1", title_en: "Science", creator_id: "u1" }],
          error: null,
        });
      }
      return chainable({ data: null, error: null });
    });
    const result = await handleUserTopics(mock as any, { user_id: "u1" });
    const json = extractJson(result) as any;
    expect(json.topics).toHaveLength(1);
    expect(json.topics[0].id).toBe("t1");
  });

  it("returns topics by display_name", async () => {
    mock.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return chainable({ data: { id: "u1" }, error: null });
      }
      if (table === "topics") {
        return chainable({
          data: [{ id: "t1", title_en: "Science", creator_id: "u1" }],
          error: null,
        });
      }
      return chainable({ data: null, error: null });
    });
    const result = await handleUserTopics(mock as any, { display_name: "Alice" });
    const json = extractJson(result) as any;
    expect(json.topics).toHaveLength(1);
  });

  it("returns error when neither param provided", async () => {
    const result = await handleUserTopics(mock as any, {});
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("returns error on DB failure", async () => {
    mock.from.mockReturnValue(
      chainable({ data: null, error: { message: "fail" } })
    );
    const result = await handleUserTopics(mock as any, { user_id: "u1" });
    expect(extractText(result)).toContain("Error");
    expect(result.isError).toBe(true);
  });

  it("returns empty when user has no topics", async () => {
    mock.from.mockReturnValue(
      chainable({ data: [], error: null })
    );
    const result = await handleUserTopics(mock as any, { user_id: "u1" });
    const json = extractJson(result) as any;
    expect(json.topics).toEqual([]);
  });
});
