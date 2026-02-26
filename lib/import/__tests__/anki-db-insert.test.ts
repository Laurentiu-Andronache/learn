import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

// Chainable query builder mock
function chainable(result: { data: unknown; error: unknown }) {
  const self = {
    insert: vi.fn(() => self),
    select: vi.fn(() => self),
    single: vi.fn(() => Promise.resolve(result)),
    // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock
    then: (resolve: (v: typeof result) => void) =>
      Promise.resolve(result).then(resolve),
  };
  return self;
}

let topicChain: ReturnType<typeof chainable>;
let categoryChain: ReturnType<typeof chainable>;
let flashcardChain: ReturnType<typeof chainable>;

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === "topics") return topicChain;
    if (table === "categories") return categoryChain;
    if (table === "flashcards") return flashcardChain;
    return chainable({ data: null, error: null });
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

import { importAnkiDeck } from "../anki-db-insert";
import type { AnkiImportOptions, ParsedDeck } from "../anki-types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeParsedDeck(overrides?: Partial<ParsedDeck>): ParsedDeck {
  return {
    name: "Test Deck",
    description: "A test deck",
    categories: [
      {
        name: "General",
        slug: "general",
        flashcards: [
          {
            front: "What is 2+2?",
            back: "4",
            extra: "",
            tags: [],
            mediaRefs: [],
          },
          {
            front: "What is 3+3?",
            back: "6",
            extra: "simple math",
            tags: [],
            mediaRefs: [],
          },
        ],
      },
    ],
    warnings: [],
    mediaFiles: new Map(),
    ...overrides,
  };
}

const defaultOptions: AnkiImportOptions = {
  language: "en",
  visibility: "public",
  autoTranslate: false,
  userId: "user-123",
  isAdmin: false,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("importAnkiDeck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    topicChain = chainable({
      data: { id: "topic-abc" },
      error: null,
    });
    categoryChain = chainable({
      data: { id: "cat-xyz" },
      error: null,
    });
    flashcardChain = chainable({ data: null, error: null });
    // Reset flashcardChain to not require .single()
    flashcardChain.single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
  });

  it("inserts topic, category, and flashcards successfully", async () => {
    const deck = makeParsedDeck();
    const result = await importAnkiDeck(deck, defaultOptions);

    expect(result.topicId).toBe("topic-abc");
    expect(result.flashcardsImported).toBe(2);
    expect(result.warnings).toHaveLength(0);
    expect(mockSupabase.from).toHaveBeenCalledWith("topics");
    expect(mockSupabase.from).toHaveBeenCalledWith("categories");
    expect(mockSupabase.from).toHaveBeenCalledWith("flashcards");
  });

  it("uses the specified language for field names", async () => {
    const deck = makeParsedDeck();
    const esOptions = { ...defaultOptions, language: "es" as const };
    await importAnkiDeck(deck, esOptions);

    // Verify topic was inserted with Spanish field names
    expect(topicChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title_es: "Test Deck",
        title_en: "Test Deck",
      }),
    );
  });

  it("throws when topic insert fails", async () => {
    topicChain = chainable({
      data: null,
      error: { message: "Duplicate title" },
    });

    const deck = makeParsedDeck();

    await expect(importAnkiDeck(deck, defaultOptions)).rejects.toThrow(
      "Topic insert failed: Duplicate title",
    );
  });

  it("adds warning and continues when category insert fails", async () => {
    categoryChain = chainable({
      data: null,
      error: { message: "Duplicate slug" },
    });

    const deck = makeParsedDeck();
    const result = await importAnkiDeck(deck, defaultOptions);

    expect(result.topicId).toBe("topic-abc");
    // No flashcards inserted since category failed
    expect(result.flashcardsImported).toBe(0);
    expect(result.warnings.some((w) => w.includes("Duplicate slug"))).toBe(
      true,
    );
  });

  it("adds warning when flashcard batch insert fails", async () => {
    // Override flashcardChain to simulate error on insert
    const errorResult = { data: null, error: { message: "Row too large" } };
    flashcardChain = chainable(errorResult);

    const deck = makeParsedDeck();
    const result = await importAnkiDeck(deck, defaultOptions);

    expect(result.flashcardsImported).toBe(0);
    expect(result.warnings.some((w) => w.includes("Row too large"))).toBe(true);
  });

  it("revalidates cache paths after import", async () => {
    const deck = makeParsedDeck();
    await importAnkiDeck(deck, defaultOptions);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/topics");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/topics");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/flashcards");
  });

  it("uses presetTopicId when provided", async () => {
    const deck = makeParsedDeck();
    await importAnkiDeck(deck, defaultOptions, "preset-id-999");

    expect(topicChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "preset-id-999" }),
    );
  });
});
