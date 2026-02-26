import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockZipFiles: Record<
  string,
  { dir: boolean; async: (type: string) => Promise<unknown> }
> = {};

vi.mock("jszip", () => ({
  default: {
    loadAsync: vi.fn(() =>
      Promise.resolve({
        files: mockZipFiles,
      }),
    ),
  },
}));

const mockReadAnkiCollection = vi.fn();
vi.mock("anki-reader", () => ({
  readAnkiCollection: (...args: unknown[]) => mockReadAnkiCollection(...args),
}));

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => new Uint8Array([0, 1, 2, 3])),
}));

vi.mock("node:path", () => ({
  join: vi.fn((...parts: string[]) => parts.join("/")),
}));

const mockProcessNoteToFlashcards = vi.fn();

vi.mock("../anki-templates", () => ({
  processNoteToFlashcards: (...args: unknown[]) =>
    mockProcessNoteToFlashcards(...args),
}));

import { parseApkg } from "../anki-parser";
import { IMPORT_LIMITS } from "../anki-types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function defaultProcessNote(
  fields: string[],
  fieldNames: string[],
  _model: unknown,
  _tags: string[],
) {
  return [
    {
      front: fields[0] ?? "",
      back: fields[1] ?? "",
      extra: "",
      templateName: fieldNames[0] ?? "Card",
    },
  ];
}

function multiCardProcessNote(cardsPerNote: number) {
  return (
    fields: string[],
    fieldNames: string[],
    _model: unknown,
    _tags: string[],
  ) => {
    const cards = [];
    for (let i = 0; i < cardsPerNote; i++) {
      cards.push({
        front: `${fields[0] ?? ""} (card ${i + 1})`,
        back: fields[1] ?? "",
        extra: "",
        templateName: fieldNames[0] ?? "Card",
      });
    }
    return cards;
  };
}

function makeCollectionMock(opts?: {
  models?: Record<string, unknown>[];
  decks?: Record<string, unknown>[];
  noteRows?: unknown[][];
}) {
  return {
    getModels: () => opts?.models ?? [],
    getDecks: () =>
      opts?.decks ?? [{ name: "Test Deck", getName: () => "Test Deck" }],
    getRawCollection: () => ({
      exec: (_sql: string) =>
        opts?.noteRows && opts.noteRows.length > 0
          ? [{ values: opts.noteRows }]
          : [],
    }),
  };
}

function setZipFiles(
  files: Record<
    string,
    { dir?: boolean; content?: unknown; stringContent?: string }
  >,
) {
  for (const key of Object.keys(mockZipFiles)) {
    delete mockZipFiles[key];
  }
  for (const [name, opts] of Object.entries(files)) {
    mockZipFiles[name] = {
      dir: opts.dir ?? false,
      async: (type: string) => {
        if (type === "arraybuffer") return Promise.resolve(new ArrayBuffer(10));
        if (type === "uint8array")
          return Promise.resolve(new Uint8Array([1, 2, 3]));
        if (type === "string") return Promise.resolve(opts.stringContent ?? "");
        return Promise.resolve(opts.content ?? new ArrayBuffer(10));
      },
    };
  }
}

const basicModel = {
  id: "model-1",
  modelJson: {
    id: "model-1",
    name: "Basic",
    type: 0,
    flds: [
      { name: "Front", ord: 0 },
      { name: "Back", ord: 1 },
    ],
    tmpls: [{ name: "Card 1", ord: 0, qfmt: "{{Front}}", afmt: "{{Back}}" }],
  },
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("parseApkg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessNoteToFlashcards.mockImplementation(defaultProcessNote);
    setZipFiles({
      "collection.anki21": {},
    });
    mockReadAnkiCollection.mockResolvedValue(
      makeCollectionMock({
        models: [basicModel],
        decks: [{ name: "My Deck", getName: () => "My Deck" }],
        noteRows: [[1001, "model-1", "What is 2+2?\x1f4", "TAG::Math"]],
      }),
    );
  });

  it("parses a valid .apkg with collection.anki21", async () => {
    const result = await parseApkg(new ArrayBuffer(10));

    expect(result.name).toBe("My Deck");
    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.categories[0].flashcards.length).toBe(1);
    expect(result.categories[0].flashcards[0].front).toBe("What is 2+2?");
  });

  it("falls back to collection.anki2 when anki21 is missing", async () => {
    setZipFiles({
      "collection.anki2": {},
    });

    const result = await parseApkg(new ArrayBuffer(10));

    expect(result.name).toBe("My Deck");
    expect(result.categories.length).toBeGreaterThan(0);
  });

  it("throws when no collection database is found", async () => {
    setZipFiles({
      "some-other-file.txt": {},
    });

    await expect(parseApkg(new ArrayBuffer(10))).rejects.toThrow(
      "No collection database found in .apkg file",
    );
  });

  it("extracts media files from the archive", async () => {
    setZipFiles({
      "collection.anki21": {},
      media: { stringContent: '{"0":"image.png","1":"audio.mp3"}' },
      "0": {},
      "1": {},
    });

    const result = await parseApkg(new ArrayBuffer(10));

    expect(result.mediaFiles.size).toBe(2);
    expect(result.mediaFiles.has("image.png")).toBe(true);
    expect(result.mediaFiles.has("audio.mp3")).toBe(true);
  });

  it("adds warning when media mapping JSON is invalid", async () => {
    setZipFiles({
      "collection.anki21": {},
      media: { stringContent: "NOT VALID JSON{{{" },
    });

    const result = await parseApkg(new ArrayBuffer(10));

    expect(result.warnings).toContain("Failed to parse media mapping JSON");
  });

  it("processes models and skips invalid ones", async () => {
    mockReadAnkiCollection.mockResolvedValue(
      makeCollectionMock({
        models: [
          basicModel,
          {
            id: "bad-model",
            modelJson: {
              id: "bad-model",
              name: "Bad",
              type: 0,
              flds: "not-an-array",
              tmpls: null,
            },
          },
        ],
        noteRows: [
          [1, "model-1", "Q\x1fA", ""],
          [2, "bad-model", "Q2\x1fA2", ""],
        ],
      }),
    );

    const result = await parseApkg(new ArrayBuffer(10));

    expect(result.warnings.some((w) => w.includes("bad-model"))).toBe(true);
    const totalCards = result.categories.reduce(
      (sum, c) => sum + c.flashcards.length,
      0,
    );
    expect(totalCards).toBe(1);
  });

  it("enforces flashcard limit", async () => {
    // 3 cards per note so limit is hit mid-note, triggering the warning
    mockProcessNoteToFlashcards.mockImplementation(multiCardProcessNote(3));

    const noteRows: unknown[][] = [];
    const notesNeeded = Math.floor(IMPORT_LIMITS.maxFlashcards / 3) + 10;
    for (let i = 0; i < notesNeeded; i++) {
      noteRows.push([i, "model-1", `Q${i}\x1fA${i}`, ""]);
    }

    mockReadAnkiCollection.mockResolvedValue(
      makeCollectionMock({
        models: [basicModel],
        noteRows,
      }),
    );

    const result = await parseApkg(new ArrayBuffer(10));

    const totalCards = result.categories.reduce(
      (sum, c) => sum + c.flashcards.length,
      0,
    );
    expect(totalCards).toBeLessThanOrEqual(IMPORT_LIMITS.maxFlashcards);
    expect(
      result.warnings.some((w) => w.includes("Flashcard limit reached")),
    ).toBe(true);
  });

  it("enforces media file limit", async () => {
    const mediaMapping: Record<string, string> = {};
    const zipFiles: Record<string, { dir?: boolean; stringContent?: string }> =
      {
        "collection.anki21": {},
      };

    for (let i = 0; i < IMPORT_LIMITS.maxMediaFiles + 10; i++) {
      mediaMapping[String(i)] = `file_${i}.png`;
      zipFiles[String(i)] = {};
    }
    zipFiles.media = { stringContent: JSON.stringify(mediaMapping) };

    setZipFiles(zipFiles);

    const result = await parseApkg(new ArrayBuffer(10));

    expect(result.mediaFiles.size).toBeLessThanOrEqual(
      IMPORT_LIMITS.maxMediaFiles,
    );
    expect(result.warnings.some((w) => w.includes("Media limit reached"))).toBe(
      true,
    );
  });
});
