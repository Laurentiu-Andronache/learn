import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcessedMedia } from "../anki-types";
import { IMPORT_LIMITS } from "../anki-types";

// ── Mocks ────────────────────────────────────────────────────────────────────

// STORAGE_URL is captured at module top-level from process.env.NEXT_PUBLIC_SUPABASE_URL
// Must be set before the module is imported. vi.hoisted runs before imports.
const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";

  const sharpInstance = {
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("optimized-webp")),
  };
  const sharpFn = vi.fn(() => sharpInstance);

  const encodeBuffer = vi.fn().mockReturnValue(new Uint8Array([0xff, 0xfb]));
  const flushFn = vi.fn().mockReturnValue(new Uint8Array([0x00]));

  return { sharpInstance, sharpFn, encodeBuffer, flushFn };
});

vi.mock("@/lib/env", () => ({
  env: {
    SUPABASE_URL: "https://test.supabase.co",
    SERVICE_ROLE_KEY: "test-service-role-key",
  },
}));

vi.mock("sharp", () => ({ default: mocks.sharpFn }));

vi.mock("lamejs", () => {
  // Must use a regular function (not arrow) for `new` constructor calls
  function MockMp3Encoder() {
    return {
      encodeBuffer: mocks.encodeBuffer,
      flush: mocks.flushFn,
    };
  }
  return {
    default: { Mp3Encoder: MockMp3Encoder },
    Mp3Encoder: MockMp3Encoder,
  };
});

// ── Imports (after mocks) ────────────────────────────────────────────────────

import {
  detectMediaType,
  processAllMedia,
  rewriteMediaRefs,
} from "../anki-media";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMediaFiles(
  entries: [string, Uint8Array][],
): Map<string, Uint8Array> {
  return new Map(entries);
}

/** Create a minimal valid WAV buffer (44-byte header + PCM data, 16-bit mono). */
function makeWavBuffer(opts?: {
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  pcmBytes?: number;
}): Uint8Array {
  const sampleRate = opts?.sampleRate ?? 44100;
  const channels = opts?.channels ?? 1;
  const bitsPerSample = opts?.bitsPerSample ?? 16;
  const pcmBytes = opts?.pcmBytes ?? 100;

  const headerSize = 44;
  const buf = Buffer.alloc(headerSize + pcmBytes);

  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + pcmBytes, 4);
  buf.write("WAVE", 8);

  // fmt subchunk
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // audio format (PCM)
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buf.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buf.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buf.write("data", 36);
  buf.writeUInt32LE(pcmBytes, 40);

  // Fill with PCM data
  for (let i = headerSize; i < buf.length; i++) {
    buf[i] = i % 256;
  }

  return new Uint8Array(buf);
}

const TOPIC_ID = "test-topic-123";

// ── Setup / Teardown ─────────────────────────────────────────────────────────

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();

  // Reset sharp to return small buffer (within maxImageSize)
  mocks.sharpInstance.resize.mockReturnThis();
  mocks.sharpInstance.webp.mockReturnThis();
  mocks.sharpInstance.toBuffer.mockResolvedValue(Buffer.from("optimized-webp"));

  // Reset lamejs mocks
  mocks.encodeBuffer.mockReturnValue(new Uint8Array([0xff, 0xfb]));
  mocks.flushFn.mockReturnValue(new Uint8Array([0x00]));

  // Default: successful upload
  mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    text: vi.fn().mockResolvedValue(""),
  });
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── detectMediaType ──────────────────────────────────────────────────────────

describe("detectMediaType", () => {
  it("returns 'image' for raster image extensions", () => {
    for (const ext of [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".tiff",
      ".tif",
      ".webp",
    ]) {
      expect(detectMediaType(`photo${ext}`)).toBe("image");
    }
  });

  it("returns 'svg' for .svg files", () => {
    expect(detectMediaType("diagram.svg")).toBe("svg");
  });

  it("returns 'audio' for audio extensions", () => {
    for (const ext of [".mp3", ".ogg", ".m4a", ".aac", ".wav", ".flac"]) {
      expect(detectMediaType(`recording${ext}`)).toBe("audio");
    }
  });

  it("returns 'skip' for script/style extensions", () => {
    for (const ext of [".js", ".css", ".html", ".py"]) {
      expect(detectMediaType(`file${ext}`)).toBe("skip");
    }
  });

  it("returns 'skip' for unknown extensions", () => {
    expect(detectMediaType("data.xyz")).toBe("skip");
    expect(detectMediaType("archive.tar")).toBe("skip");
    expect(detectMediaType("readme.txt")).toBe("skip");
  });

  it("is case-insensitive (lowercases extension)", () => {
    expect(detectMediaType("photo.PNG")).toBe("image");
    expect(detectMediaType("song.MP3")).toBe("audio");
    expect(detectMediaType("icon.SVG")).toBe("svg");
  });
});

// ── rewriteMediaRefs ─────────────────────────────────────────────────────────

describe("rewriteMediaRefs", () => {
  const media: ProcessedMedia = {
    filename: "cat.png",
    storagePath: "topic-1/cat.webp",
    publicUrl: "https://cdn.example.com/cat.webp",
    type: "image",
  };

  function makeMap(...entries: ProcessedMedia[]): Map<string, ProcessedMedia> {
    return new Map(entries.map((e) => [e.filename, e]));
  }

  it("replaces markdown image refs ![alt](filename)", () => {
    const input = "Here is a cat: ![a cat](cat.png)";
    const result = rewriteMediaRefs(input, makeMap(media));
    expect(result).toBe(
      "Here is a cat: ![a cat](https://cdn.example.com/cat.webp)",
    );
  });

  it("replaces markdown image refs with empty alt ![](filename)", () => {
    const input = "![](cat.png)";
    const result = rewriteMediaRefs(input, makeMap(media));
    expect(result).toBe("![](https://cdn.example.com/cat.webp)");
  });

  it("replaces markdown link refs [text](filename)", () => {
    const input = "See [this image](cat.png) for details.";
    const result = rewriteMediaRefs(input, makeMap(media));
    expect(result).toBe(
      "See [this image](https://cdn.example.com/cat.webp) for details.",
    );
  });

  it("replaces HTML img src attributes", () => {
    const input = '<img src="cat.png" alt="cat">';
    const result = rewriteMediaRefs(input, makeMap(media));
    expect(result).toBe(
      '<img src="https://cdn.example.com/cat.webp" alt="cat">',
    );
  });

  it("replaces [sound:filename] Anki-style audio refs", () => {
    const audioMedia: ProcessedMedia = {
      filename: "pronounce.mp3",
      storagePath: "topic-1/pronounce.mp3",
      publicUrl: "https://cdn.example.com/pronounce.mp3",
      type: "audio",
    };
    const input = "Listen: [sound:pronounce.mp3]";
    const result = rewriteMediaRefs(input, makeMap(audioMedia));
    expect(result).toBe(
      "Listen: [audio](https://cdn.example.com/pronounce.mp3)",
    );
  });

  it("returns unchanged content when mediaMap is empty", () => {
    const input = "![alt](cat.png) and [sound:audio.mp3]";
    const result = rewriteMediaRefs(input, new Map());
    expect(result).toBe(input);
  });

  it("returns unchanged content when input is empty string", () => {
    expect(rewriteMediaRefs("", makeMap(media))).toBe("");
  });

  it("handles multiple refs of different types in same content", () => {
    const audioMedia: ProcessedMedia = {
      filename: "sound.mp3",
      storagePath: "topic-1/sound.mp3",
      publicUrl: "https://cdn.example.com/sound.mp3",
      type: "audio",
    };
    const input = '![](cat.png) and [sound:sound.mp3] plus <img src="cat.png">';
    const result = rewriteMediaRefs(input, makeMap(media, audioMedia));
    expect(result).toContain("https://cdn.example.com/cat.webp");
    expect(result).toContain("https://cdn.example.com/sound.mp3");
    expect(result).not.toContain("(cat.png)");
    expect(result).not.toContain("[sound:sound.mp3]");
  });

  it("escapes special regex characters in filenames", () => {
    const specialMedia: ProcessedMedia = {
      filename: "file (1).png",
      storagePath: "topic-1/file__1_.webp",
      publicUrl: "https://cdn.example.com/file__1_.webp",
      type: "image",
    };
    const input = "![](file (1).png)";
    const result = rewriteMediaRefs(input, makeMap(specialMedia));
    expect(result).toBe("![](https://cdn.example.com/file__1_.webp)");
  });
});

// ── processAllMedia ──────────────────────────────────────────────────────────

describe("processAllMedia", () => {
  it("returns empty results for empty mediaFiles", async () => {
    const result = await processAllMedia(new Map(), TOPIC_ID);
    expect(result.processed).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips unsupported files with a warning", async () => {
    const files = makeMediaFiles([
      ["script.js", new Uint8Array([1, 2, 3])],
      ["style.css", new Uint8Array([4, 5, 6])],
    ]);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(0);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toContain("Skipped unsupported file");
    expect(result.warnings[0]).toContain("script.js");
    expect(result.warnings[1]).toContain("style.css");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips oversized audio files with a warning", async () => {
    const oversized = new Uint8Array(IMPORT_LIMITS.maxAudioFileSize + 1);
    const files = makeMediaFiles([["huge.mp3", oversized]]);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Skipped oversized audio");
    expect(result.warnings[0]).toContain("huge.mp3");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("processes image files via sharp and uploads as .webp", async () => {
    const files = makeMediaFiles([
      ["photo.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
    ]);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(1);
    expect(result.processed[0].filename).toBe("photo.png");
    expect(result.processed[0].storagePath).toContain("photo.webp");
    expect(result.processed[0].type).toBe("image");
    expect(result.processed[0].publicUrl).toContain(
      "storage/v1/object/public/anki-media/",
    );

    // Verify sharp was called
    expect(mocks.sharpFn).toHaveBeenCalled();
    expect(mocks.sharpInstance.resize).toHaveBeenCalled();
    expect(mocks.sharpInstance.webp).toHaveBeenCalled();

    // Verify upload was called with correct content type
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("anki-media");
    expect(url).toContain("photo.webp");
    expect(opts.headers["Content-Type"]).toBe("image/webp");
  });

  it("processes SVG files as passthrough (no sharp)", async () => {
    const svgData = new Uint8Array(Buffer.from("<svg><circle r='10'/></svg>"));
    const files = makeMediaFiles([["diagram.svg", svgData]]);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(1);
    expect(result.processed[0].filename).toBe("diagram.svg");
    expect(result.processed[0].storagePath).toContain("diagram.svg");
    expect(result.processed[0].type).toBe("svg");

    // sharp should NOT be called for SVG
    expect(mocks.sharpFn).not.toHaveBeenCalled();

    // Upload with SVG content type
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBe("image/svg+xml");
  });

  it("processes non-WAV audio files as passthrough", async () => {
    const mp3Data = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
    const files = makeMediaFiles([["speech.mp3", mp3Data]]);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(1);
    expect(result.processed[0].filename).toBe("speech.mp3");
    expect(result.processed[0].storagePath).toContain("speech.mp3");
    expect(result.processed[0].type).toBe("audio");

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBe("audio/mpeg");
  });

  it("processes WAV audio files via lamejs encoder", async () => {
    const wavData = makeWavBuffer({ channels: 1, pcmBytes: 200 });
    const files = makeMediaFiles([["recording.wav", wavData]]);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(1);
    expect(result.processed[0].storagePath).toContain("recording.mp3");
    expect(result.processed[0].type).toBe("audio");

    // lamejs encoder should have been called
    expect(mocks.encodeBuffer).toHaveBeenCalled();
    expect(mocks.flushFn).toHaveBeenCalled();

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBe("audio/mpeg");
  });

  it("handles upload failure gracefully with a warning", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("Internal Server Error"),
    });

    const files = makeMediaFiles([["photo.png", new Uint8Array([0x89, 0x50])]]);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Failed to process photo.png");
    expect(result.warnings[0]).toContain("Storage upload failed");
  });

  it("processes multiple files of different types", async () => {
    const files = makeMediaFiles([
      ["photo.jpg", new Uint8Array([0xff, 0xd8])],
      ["icon.svg", new Uint8Array(Buffer.from("<svg/>"))],
      ["clip.mp3", new Uint8Array([0xff, 0xfb])],
      ["script.js", new Uint8Array([0x00])],
    ]);

    const result = await processAllMedia(files, TOPIC_ID);

    // 3 processed (image, svg, audio), 1 skipped
    expect(result.processed).toHaveLength(3);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("script.js");

    const types = result.processed.map((p) => p.type).sort();
    expect(types).toEqual(["audio", "image", "svg"]);
  });

  // ── sanitizeStorageName (indirect) ──

  it("sanitizes accented characters in filenames", async () => {
    const files = makeMediaFiles([
      ["caf\u00e9_r\u00e9sum\u00e9.png", new Uint8Array([0x89, 0x50])],
    ]);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(1);
    // Accented chars should be transliterated (e with accent → e)
    expect(result.processed[0].storagePath).toContain("cafe_resume.webp");
    expect(result.processed[0].storagePath).not.toContain("\u00e9");
  });

  it("sanitizes special characters in filenames", async () => {
    const files = makeMediaFiles([
      ["file (1) [copy].png", new Uint8Array([0x89])],
    ]);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(1);
    // Spaces, parens, brackets should become underscores
    const storagePath = result.processed[0].storagePath;
    expect(storagePath).not.toContain(" ");
    expect(storagePath).not.toContain("(");
    expect(storagePath).not.toContain("[");
    expect(storagePath).toContain("file_");
  });

  it("preserves plain ASCII filenames in storage path", async () => {
    const files = makeMediaFiles([
      ["simple-photo_01.png", new Uint8Array([0x89])],
    ]);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(1);
    // Extension changes to .webp, but the base name should be preserved
    expect(result.processed[0].storagePath).toBe(
      `${TOPIC_ID}/simple-photo_01.webp`,
    );
  });

  // ── contentTypeFor (indirect) ──

  it("uses image/webp content type for optimized images", async () => {
    const files = makeMediaFiles([
      ["anim.gif", new Uint8Array([0x47, 0x49, 0x46])],
    ]);

    await processAllMedia(files, TOPIC_ID);

    // sharp converts to .webp
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBe("image/webp");
  });

  it("uses audio/ogg content type for .ogg files", async () => {
    const files = makeMediaFiles([["sound.ogg", new Uint8Array([0x4f, 0x67])]]);

    await processAllMedia(files, TOPIC_ID);

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBe("audio/ogg");
  });

  it("uses audio/mp4 content type for .m4a files", async () => {
    const files = makeMediaFiles([["voice.m4a", new Uint8Array([0x00, 0x00])]]);

    await processAllMedia(files, TOPIC_ID);

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBe("audio/mp4");
  });

  // ── withConcurrency (indirect) ──

  it("processes all items even with more items than concurrency limit", async () => {
    // Create more files than the concurrency limit (5)
    const entries: [string, Uint8Array][] = [];
    for (let i = 0; i < 12; i++) {
      // Use SVG to avoid sharp mock complexity with concurrent calls
      entries.push([
        `icon_${i}.svg`,
        new Uint8Array(Buffer.from(`<svg id="${i}"/>`)),
      ]);
    }
    const files = makeMediaFiles(entries);

    const result = await processAllMedia(files, TOPIC_ID);

    expect(result.processed).toHaveLength(12);
    expect(mockFetch).toHaveBeenCalledTimes(12);
  });

  // ── Upload details ──

  it("uploads with correct Authorization header and x-upsert", async () => {
    const files = makeMediaFiles([["test.mp3", new Uint8Array([0xff, 0xfb])]]);

    await processAllMedia(files, TOPIC_ID);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe("Bearer test-service-role-key");
    expect(opts.headers["x-upsert"]).toBe("true");
    expect(opts.method).toBe("POST");
    expect(opts.cache).toBe("no-store");
  });

  it("constructs publicUrl using STORAGE_URL and bucket path", async () => {
    const files = makeMediaFiles([
      ["icon.svg", new Uint8Array(Buffer.from("<svg/>"))],
    ]);

    const result = await processAllMedia(files, TOPIC_ID);

    // publicUrl should include the base URL, public path, bucket, topicId, and filename
    expect(result.processed[0].publicUrl).toContain(
      `/storage/v1/object/public/anki-media/${TOPIC_ID}/icon.svg`,
    );
  });

  // ── Audio size boundary ──

  it("processes audio exactly at the size limit", async () => {
    const atLimit = new Uint8Array(IMPORT_LIMITS.maxAudioFileSize);
    const files = makeMediaFiles([["exact.mp3", atLimit]]);

    const result = await processAllMedia(files, TOPIC_ID);

    // At the limit (not over), should be processed
    expect(result.processed).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });

  it("does not apply audio size limit to image files", async () => {
    // Image larger than maxAudioFileSize should still be processed
    const largeImage = new Uint8Array(IMPORT_LIMITS.maxAudioFileSize + 100);
    const files = makeMediaFiles([["big.png", largeImage]]);

    const result = await processAllMedia(files, TOPIC_ID);

    // Image goes through sharp optimization, no size skip
    expect(result.processed).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });

  it("includes original filename in processed entry even after conversion", async () => {
    const files = makeMediaFiles([["photo.bmp", new Uint8Array([0x42, 0x4d])]]);

    const result = await processAllMedia(files, TOPIC_ID);

    // filename should be original, not converted
    expect(result.processed[0].filename).toBe("photo.bmp");
    // storagePath should use converted extension
    expect(result.processed[0].storagePath).toContain(".webp");
  });
});
