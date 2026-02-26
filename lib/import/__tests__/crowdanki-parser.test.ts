import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

type ZipFile = {
  dir: boolean;
  async: (type: string) => Promise<unknown>;
};

let mockZipFiles: Record<string, ZipFile> = {};

vi.mock("jszip", () => ({
  default: {
    loadAsync: vi.fn(() =>
      Promise.resolve({
        files: mockZipFiles,
      }),
    ),
  },
}));

const mockProcessNoteToFlashcards = vi.fn();

vi.mock("../anki-templates", () => ({
  processNoteToFlashcards: (...args: unknown[]) =>
    mockProcessNoteToFlashcards(...args),
}));

import type { CrowdAnkiDeck } from "../anki-types";
import { IMPORT_LIMITS } from "../anki-types";
import { parseCrowdAnki } from "../crowdanki-parser";

// ── Helpers ──────────────────────────────────────────────────────────────────

function defaultProcessNote(
  fields: string[],
  _fieldNames: string[],
  _model: unknown,
  _tags: string[],
) {
  return [
    {
      front: fields[0] ?? "",
      back: fields[1] ?? "",
      extra: "",
      templateName: "Card 1",
    },
  ];
}

function multiCardProcessNote(cardsPerNote: number) {
  return (
    fields: string[],
    _fieldNames: string[],
    _model: unknown,
    _tags: string[],
  ) => {
    const cards = [];
    for (let i = 0; i < cardsPerNote; i++) {
      cards.push({
        front: `${fields[0] ?? ""} (card ${i + 1})`,
        back: fields[1] ?? "",
        extra: "",
        templateName: "Card 1",
      });
    }
    return cards;
  };
}

function makeDeck(overrides?: Partial<CrowdAnkiDeck>): CrowdAnkiDeck {
  return {
    __type__: "Deck",
    name: "Test Deck",
    desc: "A test deck",
    children: [],
    notes: [
      {
        __type__: "Note",
        fields: ["What is 2+2?", "4"],
        guid: "note-1",
        note_model_uuid: "model-1",
        tags: ["SUBJECT::Math"],
      },
    ],
    note_models: [
      {
        __type__: "NoteModel",
        crowdanki_uuid: "model-1",
        name: "Basic",
        type: 0,
        flds: [
          { name: "Front", ord: 0 },
          { name: "Back", ord: 1 },
        ],
        tmpls: [
          { name: "Card 1", ord: 0, qfmt: "{{Front}}", afmt: "{{Back}}" },
        ],
        css: "",
      },
    ],
    media_files: [],
    crowdanki_uuid: "deck-uuid-1",
    ...overrides,
  };
}

function setZipWithDeck(
  deck: CrowdAnkiDeck,
  extraFiles?: Record<string, { dir?: boolean; content?: Uint8Array }>,
) {
  mockZipFiles = {};

  mockZipFiles["deck.json"] = {
    dir: false,
    async: (type: string) => {
      if (type === "string") return Promise.resolve(JSON.stringify(deck));
      return Promise.resolve(new ArrayBuffer(0));
    },
  };

  if (extraFiles) {
    for (const [path, opts] of Object.entries(extraFiles)) {
      mockZipFiles[path] = {
        dir: opts.dir ?? false,
        async: (type: string) => {
          if (type === "uint8array")
            return Promise.resolve(opts.content ?? new Uint8Array([1, 2, 3]));
          if (type === "string") return Promise.resolve("");
          return Promise.resolve(new ArrayBuffer(0));
        },
      };
    }
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("parseCrowdAnki", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessNoteToFlashcards.mockImplementation(defaultProcessNote);
    mockZipFiles = {};
  });

  it("parses a valid CrowdAnki JSON deck", async () => {
    const deck = makeDeck();
    setZipWithDeck(deck);

    const result = await parseCrowdAnki(new ArrayBuffer(10));

    expect(result.name).toBe("Test Deck");
    expect(result.description).toBe("A test deck");
    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.categories[0].flashcards.length).toBe(1);
    expect(result.categories[0].flashcards[0].front).toBe("What is 2+2?");
  });

  it("throws when deck.json is missing", async () => {
    mockZipFiles = {
      "other-file.txt": {
        dir: false,
        async: () => Promise.resolve(""),
      },
    };

    await expect(parseCrowdAnki(new ArrayBuffer(10))).rejects.toThrow(
      "Invalid CrowdAnki archive: no deck.json found",
    );
  });

  it("finds deck.json in a subdirectory", async () => {
    mockZipFiles = {
      "MyDeck/deck.json": {
        dir: false,
        async: (type: string) => {
          if (type === "string")
            return Promise.resolve(JSON.stringify(makeDeck()));
          return Promise.resolve(new ArrayBuffer(0));
        },
      },
    };

    const result = await parseCrowdAnki(new ArrayBuffer(10));

    expect(result.name).toBe("Test Deck");
  });

  it("extracts media files from media/ directory", async () => {
    const deck = makeDeck();
    setZipWithDeck(deck, {
      "media/image.png": { content: new Uint8Array([137, 80, 78, 71]) },
      "media/audio.mp3": { content: new Uint8Array([73, 68, 51]) },
    });

    const result = await parseCrowdAnki(new ArrayBuffer(10));

    expect(result.mediaFiles.size).toBe(2);
    expect(result.mediaFiles.has("image.png")).toBe(true);
    expect(result.mediaFiles.has("audio.mp3")).toBe(true);
  });

  it("processes child deck notes", async () => {
    const childDeck: CrowdAnkiDeck = {
      __type__: "Deck",
      name: "Child Deck",
      children: [],
      notes: [
        {
          __type__: "Note",
          fields: ["Child Q", "Child A"],
          guid: "child-note-1",
          note_model_uuid: "model-1",
          tags: [],
        },
      ],
      note_models: [],
      media_files: [],
      crowdanki_uuid: "child-uuid",
    };

    const deck = makeDeck({ children: [childDeck] });
    setZipWithDeck(deck);

    const result = await parseCrowdAnki(new ArrayBuffer(10));

    const totalCards = result.categories.reduce(
      (sum, c) => sum + c.flashcards.length,
      0,
    );
    expect(totalCards).toBe(2);
  });

  it("extracts categories from hierarchical tags", async () => {
    const deck = makeDeck({
      notes: [
        {
          __type__: "Note",
          fields: ["Q1", "A1"],
          guid: "n-1",
          note_model_uuid: "model-1",
          tags: ["TOPIC::Biology"],
        },
        {
          __type__: "Note",
          fields: ["Q2", "A2"],
          guid: "n-2",
          note_model_uuid: "model-1",
          tags: ["TOPIC::Chemistry"],
        },
        {
          __type__: "Note",
          fields: ["Q3", "A3"],
          guid: "n-3",
          note_model_uuid: "model-1",
          tags: [],
        },
      ],
    });
    setZipWithDeck(deck);

    const result = await parseCrowdAnki(new ArrayBuffer(10));

    const categoryNames = result.categories.map((c) => c.name);
    expect(categoryNames).toContain("Biology");
    expect(categoryNames).toContain("Chemistry");
    expect(categoryNames).toContain("General");
  });

  it("enforces flashcard limit", async () => {
    // 3 cards per note so limit is hit mid-note, triggering the warning
    mockProcessNoteToFlashcards.mockImplementation(multiCardProcessNote(3));

    const notes = [];
    const notesNeeded = Math.floor(IMPORT_LIMITS.maxFlashcards / 3) + 10;
    for (let i = 0; i < notesNeeded; i++) {
      notes.push({
        __type__: "Note" as const,
        fields: [`Q${i}`, `A${i}`],
        guid: `note-${i}`,
        note_model_uuid: "model-1",
        tags: [],
      });
    }

    const deck = makeDeck({ notes });
    setZipWithDeck(deck);

    const result = await parseCrowdAnki(new ArrayBuffer(10));

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
    const deck = makeDeck();
    const mediaFiles: Record<string, { content: Uint8Array }> = {};
    for (let i = 0; i < IMPORT_LIMITS.maxMediaFiles + 10; i++) {
      mediaFiles[`media/file_${i}.png`] = {
        content: new Uint8Array([1, 2, 3]),
      };
    }

    setZipWithDeck(deck, mediaFiles);

    const result = await parseCrowdAnki(new ArrayBuffer(10));

    expect(result.mediaFiles.size).toBeLessThanOrEqual(
      IMPORT_LIMITS.maxMediaFiles,
    );
    expect(result.warnings.some((w) => w.includes("Media limit reached"))).toBe(
      true,
    );
  });

  it("strips HTML from description and truncates to 500 chars", async () => {
    const longDesc = `<p>${"A".repeat(600)}</p>`;
    const deck = makeDeck({ desc: longDesc });
    setZipWithDeck(deck);

    const result = await parseCrowdAnki(new ArrayBuffer(10));

    expect(result.description.length).toBeLessThanOrEqual(500);
    expect(result.description).not.toContain("<p>");
  });
});
