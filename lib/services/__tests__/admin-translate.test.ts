import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  callAnthropicAPI: vi.fn(),
  stripCodeFences: vi.fn((s: string) => s),
}));

vi.mock("@/lib/supabase/server", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/services/anthropic", () => ({
  callAnthropicAPI: mocks.callAnthropicAPI,
  stripCodeFences: mocks.stripCodeFences,
}));

import { translateFields } from "../admin-translate";

const originalEnv = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
  mocks.requireAdmin.mockResolvedValue({
    supabase: {},
    user: { id: "admin-uuid", email: "admin@test.com" },
  });
  mocks.stripCodeFences.mockImplementation((s: string) => s);
});

afterEach(() => {
  if (originalEnv !== undefined) {
    process.env.ANTHROPIC_API_KEY = originalEnv;
  } else {
    delete process.env.ANTHROPIC_API_KEY;
  }
});

// ─── AUTH ───────────────────────────────────────────────────────────

describe("translateFields", () => {
  it("returns error when not admin", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("Unauthorized"));

    const result = await translateFields({
      fields: { title: "Hello" },
      sourceLang: "en",
      targetLang: "es",
    });

    expect(result).toEqual({ data: null, error: "Unauthorized" });
  });

  it("returns error when ANTHROPIC_API_KEY not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await translateFields({
      fields: { title: "Hello" },
      sourceLang: "en",
      targetLang: "es",
    });

    expect(result).toEqual({
      data: null,
      error: "ANTHROPIC_API_KEY not configured",
    });
  });

  // ─── EMPTY FIELDS ──────────────────────────────────────────────────

  it("returns empty data when all fields are empty/null", async () => {
    const result = await translateFields({
      fields: { title: null, desc: "", tags: [] },
      sourceLang: "en",
      targetLang: "es",
    });

    expect(result).toEqual({ data: {}, error: null });
    expect(mocks.callAnthropicAPI).not.toHaveBeenCalled();
  });

  // ─── SUCCESS ──────────────────────────────────────────────────────

  it("translates fields successfully", async () => {
    const translated = { title: "Hola", desc: "Mundo" };
    mocks.callAnthropicAPI.mockResolvedValue(JSON.stringify(translated));

    const result = await translateFields({
      fields: { title: "Hello", desc: "World" },
      sourceLang: "en",
      targetLang: "es",
    });

    expect(result).toEqual({ data: translated, error: null });
    expect(mocks.callAnthropicAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-key",
        maxTokens: 4096,
      }),
    );
  });

  // ─── API ERROR ────────────────────────────────────────────────────

  it("handles API errors gracefully", async () => {
    mocks.callAnthropicAPI.mockRejectedValue(new Error("Rate limited"));

    const result = await translateFields({
      fields: { title: "Hello" },
      sourceLang: "en",
      targetLang: "es",
    });

    expect(result).toEqual({
      data: null,
      error: "API error: Rate limited",
    });
  });

  // ─── CODE FENCES ──────────────────────────────────────────────────

  it("strips code fences from response", async () => {
    const fenced = '```json\n{"title":"Hola"}\n```';
    mocks.callAnthropicAPI.mockResolvedValue(fenced);
    mocks.stripCodeFences.mockReturnValue('{"title":"Hola"}');

    const result = await translateFields({
      fields: { title: "Hello" },
      sourceLang: "en",
      targetLang: "es",
    });

    expect(mocks.stripCodeFences).toHaveBeenCalledWith(fenced);
    expect(result).toEqual({ data: { title: "Hola" }, error: null });
  });

  // ─── ARRAY MISMATCH ──────────────────────────────────────────────

  it("drops mismatched array lengths from translation", async () => {
    const translated = {
      options: ["Opt A", "Opt B"], // source has 3, translated has 2 → drop
      title: "Hola",
    };
    mocks.callAnthropicAPI.mockResolvedValue(JSON.stringify(translated));

    const result = await translateFields({
      fields: { options: ["A", "B", "C"], title: "Hello" },
      sourceLang: "en",
      targetLang: "es",
    });

    expect(result.data).toEqual({ title: "Hola" }); // options dropped
    expect(result.error).toBeNull();
  });

  // ─── JSON PARSE FAILURE ───────────────────────────────────────────

  it("handles JSON parse failure", async () => {
    mocks.callAnthropicAPI.mockResolvedValue("not valid json {{{");
    mocks.stripCodeFences.mockReturnValue("not valid json {{{");

    const result = await translateFields({
      fields: { title: "Hello" },
      sourceLang: "en",
      targetLang: "es",
    });

    expect(result).toEqual({
      data: null,
      error: "Failed to parse translation response",
    });
  });
});
