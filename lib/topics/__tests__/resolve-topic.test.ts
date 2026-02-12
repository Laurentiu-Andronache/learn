import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

import { isUuidParam, resolveTopic, resolveTopicSelect } from "../resolve-topic";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── isUuidParam (pure function) ─────────────────────────────────────

describe("isUuidParam", () => {
  it("returns true for a valid UUID", () => {
    expect(isUuidParam("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(true);
  });

  it("returns true for UUID prefix match", () => {
    expect(isUuidParam("12345678-abcd-")).toBe(true);
  });

  it("returns false for a slug", () => {
    expect(isUuidParam("vaccines")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isUuidParam("")).toBe(false);
  });

  it("returns false for a partial UUID without second dash group", () => {
    expect(isUuidParam("12345678-")).toBe(false);
  });

  it("returns false for uppercase UUID (regex is lowercase hex)", () => {
    expect(isUuidParam("A1B2C3D4-E5F6-7890-ABCD-EF1234567890")).toBe(false);
  });
});

// ─── resolveTopic ────────────────────────────────────────────────────

describe("resolveTopic", () => {
  it("queries by id when param is a UUID", async () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const mockTopic = { id: uuid, title_en: "Test" };

    const selectMock = vi.fn();
    const eqMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({ data: mockTopic });

    const result = await resolveTopic(uuid);

    expect(eqMock).toHaveBeenCalledWith("id", uuid);
    expect(result).toEqual(mockTopic);
  });

  it("queries by slug when param is not a UUID", async () => {
    const mockTopic = { id: "some-id", slug: "vaccines", title_en: "Vaccines" };

    const selectMock = vi.fn();
    const eqMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({ data: mockTopic });

    const result = await resolveTopic("vaccines");

    expect(eqMock).toHaveBeenCalledWith("slug", "vaccines");
    expect(result).toEqual(mockTopic);
  });

  it("returns null when topic not found", async () => {
    const selectMock = vi.fn();
    const eqMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({ data: null });

    const result = await resolveTopic("nonexistent");
    expect(result).toBeNull();
  });
});

// ─── resolveTopicSelect ──────────────────────────────────────────────

describe("resolveTopicSelect", () => {
  it("passes custom select string", async () => {
    const selectMock = vi.fn();
    const eqMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({ data: { id: "x", slug: "s" } });

    const result = await resolveTopicSelect("some-slug", "id, slug");

    expect(selectMock).toHaveBeenCalledWith("id, slug");
    expect(result).toEqual({ id: "x", slug: "s" });
  });

  it("returns null when not found", async () => {
    const selectMock = vi.fn();
    const eqMock = vi.fn();
    const singleMock = vi.fn();

    mockSupabase.from.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({ data: null });

    const result = await resolveTopicSelect("nope", "id");
    expect(result).toBeNull();
  });
});
