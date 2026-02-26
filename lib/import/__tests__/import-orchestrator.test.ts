import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockParseApkg = vi.fn();
vi.mock("../anki-parser", () => ({
  parseApkg: (...args: unknown[]) => mockParseApkg(...args),
}));

const mockParseCrowdAnki = vi.fn();
vi.mock("../crowdanki-parser", () => ({
  parseCrowdAnki: (...args: unknown[]) => mockParseCrowdAnki(...args),
}));

const mockImportAnkiDeck = vi.fn();
vi.mock("../anki-db-insert", () => ({
  importAnkiDeck: (...args: unknown[]) => mockImportAnkiDeck(...args),
}));

const mockProcessAllMedia = vi.fn();
const mockRewriteMediaRefs = vi.fn((content: string) => content);
vi.mock("../anki-media", () => ({
  processAllMedia: (...args: unknown[]) => mockProcessAllMedia(...args),
  rewriteMediaRefs: (...args: unknown[]) => mockRewriteMediaRefs(...args),
}));

// Mock JSZip for detectFormat
const mockLoadAsync = vi.fn();
vi.mock("jszip", () => ({
  default: {
    loadAsync: (...args: unknown[]) => mockLoadAsync(...args),
  },
}));

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: () => "generated-uuid-123",
});

import type {
  AnkiImportOptions,
  AnkiImportResult,
  ParsedDeck,
} from "../anki-types";
import { IMPORT_LIMITS } from "../anki-types";
import { importAnkiFile } from "../import-orchestrator";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a valid ZIP buffer with PK magic bytes. */
function makeZipBuffer(size = 100): ArrayBuffer {
  const buf = new ArrayBuffer(size);
  const view = new DataView(buf);
  // PK\x03\x04 magic bytes
  view.setUint8(0, 0x50);
  view.setUint8(1, 0x4b);
  view.setUint8(2, 0x03);
  view.setUint8(3, 0x04);
  return buf;
}

function makeParsedDeck(overrides?: Partial<ParsedDeck>): ParsedDeck {
  return {
    name: "Test Deck",
    description: "",
    categories: [
      {
        name: "General",
        slug: "general",
        flashcards: [
          {
            front: "Q1",
            back: "A1",
            extra: "",
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

function makeImportResult(
  overrides?: Partial<AnkiImportResult>,
): AnkiImportResult {
  return {
    topicId: "topic-123",
    flashcardsImported: 1,
    mediaUploaded: 0,
    warnings: [],
    ...overrides,
  };
}

const defaultOptions: AnkiImportOptions = {
  language: "en",
  visibility: "private",
  autoTranslate: false,
  userId: "user-1",
  isAdmin: false,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("importAnkiFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: .apkg format detected
    mockLoadAsync.mockResolvedValue({
      files: { "collection.anki21": {} },
    });

    mockParseApkg.mockResolvedValue(makeParsedDeck());
    mockParseCrowdAnki.mockResolvedValue(makeParsedDeck());
    mockImportAnkiDeck.mockResolvedValue(makeImportResult());
    mockProcessAllMedia.mockResolvedValue({
      processed: [],
      warnings: [],
    });
  });

  it("routes .apkg files to parseApkg and inserts into DB", async () => {
    const buffer = makeZipBuffer();
    const result = await importAnkiFile(buffer, defaultOptions);

    expect(mockParseApkg).toHaveBeenCalledWith(buffer);
    expect(mockParseCrowdAnki).not.toHaveBeenCalled();
    expect(mockImportAnkiDeck).toHaveBeenCalled();
    expect(result.topicId).toBe("topic-123");
  });

  it("routes CrowdAnki .zip files to parseCrowdAnki", async () => {
    mockLoadAsync.mockResolvedValue({
      files: { "MyDeck/deck.json": {} },
    });

    const buffer = makeZipBuffer();
    const result = await importAnkiFile(buffer, defaultOptions);

    expect(mockParseCrowdAnki).toHaveBeenCalledWith(buffer);
    expect(mockParseApkg).not.toHaveBeenCalled();
    expect(result.topicId).toBe("topic-123");
  });

  it("throws for file exceeding size limit", async () => {
    const oversizedBuffer = makeZipBuffer(IMPORT_LIMITS.maxFileSize + 1);

    await expect(
      importAnkiFile(oversizedBuffer, defaultOptions),
    ).rejects.toThrow("File too large");
  });

  it("throws for non-ZIP files (bad magic bytes)", async () => {
    const badBuffer = new ArrayBuffer(10);
    // No PK magic bytes — all zeros

    await expect(importAnkiFile(badBuffer, defaultOptions)).rejects.toThrow(
      "Invalid file: not a valid ZIP/APKG file",
    );
  });

  it("throws for unknown archive format", async () => {
    mockLoadAsync.mockResolvedValue({
      files: { "random-file.txt": {} },
    });

    const buffer = makeZipBuffer();
    await expect(importAnkiFile(buffer, defaultOptions)).rejects.toThrow(
      "Unrecognized format",
    );
  });

  it("throws when no flashcards are extracted", async () => {
    mockParseApkg.mockResolvedValue(
      makeParsedDeck({
        categories: [{ name: "Empty", slug: "empty", flashcards: [] }],
      }),
    );

    const buffer = makeZipBuffer();
    await expect(importAnkiFile(buffer, defaultOptions)).rejects.toThrow(
      "No flashcards could be extracted",
    );
  });

  it("propagates errors from sub-modules", async () => {
    mockParseApkg.mockRejectedValue(new Error("SQLite parse failed"));

    const buffer = makeZipBuffer();
    await expect(importAnkiFile(buffer, defaultOptions)).rejects.toThrow(
      "SQLite parse failed",
    );
  });

  it("processes media, rewrites refs, and passes topicId to DB insert", async () => {
    const mediaFiles = new Map<string, Uint8Array>();
    mediaFiles.set("img.png", new Uint8Array([1, 2, 3]));

    mockParseApkg.mockResolvedValue(makeParsedDeck({ mediaFiles }));

    mockProcessAllMedia.mockResolvedValue({
      processed: [
        {
          filename: "img.png",
          storagePath: "generated-uuid-123/img.webp",
          publicUrl: "https://storage.example.com/img.webp",
          type: "image",
        },
      ],
      warnings: ["Optimized 1 image"],
    });

    mockRewriteMediaRefs.mockImplementation((content: string) =>
      content.replace("img.png", "img.webp"),
    );

    mockImportAnkiDeck.mockResolvedValue(
      makeImportResult({ flashcardsImported: 1 }),
    );

    const buffer = makeZipBuffer();
    const result = await importAnkiFile(buffer, defaultOptions);

    // Should call processAllMedia with the media map and generated UUID
    expect(mockProcessAllMedia).toHaveBeenCalledWith(
      mediaFiles,
      "generated-uuid-123",
    );

    // Should pass the generated UUID as presetTopicId
    expect(mockImportAnkiDeck).toHaveBeenCalledWith(
      expect.anything(),
      defaultOptions,
      "generated-uuid-123",
    );

    expect(result.mediaUploaded).toBe(1);
    expect(result.warnings).toContain("Optimized 1 image");
  });

  it("passes options (language, visibility) through to DB insert", async () => {
    const esOptions: AnkiImportOptions = {
      ...defaultOptions,
      language: "es",
      visibility: "public",
    };

    const buffer = makeZipBuffer();
    await importAnkiFile(buffer, esOptions);

    expect(mockImportAnkiDeck).toHaveBeenCalledWith(
      expect.anything(),
      esOptions,
    );
  });
});
