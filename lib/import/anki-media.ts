/**
 * Media optimization and upload pipeline for Anki imports.
 * Handles image compression (sharp → WebP), WAV→MP3 encoding (lamejs),
 * SVG passthrough, and Supabase Storage uploads.
 */

import type {
  MediaProcessingResult,
  MediaType,
  ProcessedMedia,
} from "./anki-types";
import { IMPORT_LIMITS } from "./anki-types";

// ── Supabase Storage config ──

const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = (process.env.LEARN_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY)!;
const BUCKET = "anki-media";

/** Sanitize a filename for Supabase Storage (ASCII-safe, no special chars). */
function sanitizeStorageName(name: string): string {
  // Transliterate common accented chars, then strip remaining non-ASCII
  const transliterated = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip combining diacritical marks
  // Replace non-alphanumeric (except . - _) with underscore
  return transliterated.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// ── Media type detection ──

const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".tiff",
  ".tif",
  ".webp",
]);
const SVG_EXTS = new Set([".svg"]);
const AUDIO_EXTS = new Set([".mp3", ".ogg", ".m4a", ".aac", ".wav", ".flac"]);
const SKIP_EXTS = new Set([".js", ".css", ".html", ".py"]);

export function detectMediaType(filename: string): MediaType {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return "image";
  if (SVG_EXTS.has(ext)) return "svg";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (SKIP_EXTS.has(ext)) return "skip";
  return "skip";
}

// ── Image optimization (sharp → WebP) ──

function replaceExtension(filename: string, newExt: string): string {
  const dotIdx = filename.lastIndexOf(".");
  const base = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;
  return `${base}${newExt}`;
}

async function optimizeImage(
  buffer: Buffer,
  filename: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const sharp = (await import("sharp")).default;
  const { maxImageSize, maxImageDimension } = IMPORT_LIMITS;

  // Progressive quality reduction at max dimension
  const qualitySteps = [80, 70, 60, 50, 40, 30];
  for (const quality of qualitySteps) {
    const result = await sharp(buffer)
      .resize(maxImageDimension, maxImageDimension, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
    if (result.length <= maxImageSize) {
      return { buffer: result, filename: replaceExtension(filename, ".webp") };
    }
  }

  // Downscale to 600x600, quality 40
  const medium = await sharp(buffer)
    .resize(600, 600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 40 })
    .toBuffer();
  if (medium.length <= maxImageSize) {
    return { buffer: medium, filename: replaceExtension(filename, ".webp") };
  }

  // Downscale to 400x400, quality 30
  const small = await sharp(buffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 30 })
    .toBuffer();
  return { buffer: small, filename: replaceExtension(filename, ".webp") };
}

// ── WAV decoding ──

interface WavHeader {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataOffset: number;
  dataSize: number;
}

function parseWavHeader(buf: Buffer): WavHeader | null {
  if (buf.length < 44) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buf.toString("ascii", 8, 12) !== "WAVE") return null;

  // Search for "fmt " subchunk
  let fmtOffset = -1;
  for (let i = 12; i < buf.length - 8; i++) {
    if (
      buf[i] === 0x66 && // 'f'
      buf[i + 1] === 0x6d && // 'm'
      buf[i + 2] === 0x74 && // 't'
      buf[i + 3] === 0x20 // ' '
    ) {
      fmtOffset = i;
      break;
    }
  }
  if (fmtOffset < 0) return null;

  const channels = buf.readUInt16LE(fmtOffset + 10);
  const sampleRate = buf.readUInt32LE(fmtOffset + 12);
  const bitsPerSample = buf.readUInt16LE(fmtOffset + 22);

  // Search for "data" subchunk
  let dataOffset = -1;
  let dataSize = 0;
  for (let i = fmtOffset + 8; i < buf.length - 8; i++) {
    if (
      buf[i] === 0x64 && // 'd'
      buf[i + 1] === 0x61 && // 'a'
      buf[i + 2] === 0x74 && // 't'
      buf[i + 3] === 0x61 // 'a'
    ) {
      dataSize = buf.readUInt32LE(i + 4);
      dataOffset = i + 8;
      break;
    }
  }
  if (dataOffset < 0) return null;

  return { channels, sampleRate, bitsPerSample, dataOffset, dataSize };
}

function extractPcm16(buf: Buffer, header: WavHeader): Int16Array {
  const { dataOffset, dataSize, bitsPerSample } = header;
  const end = Math.min(dataOffset + dataSize, buf.length);

  if (bitsPerSample === 16) {
    const samples = new Int16Array((end - dataOffset) >> 1);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = buf.readInt16LE(dataOffset + i * 2);
    }
    return samples;
  }

  // 8-bit unsigned → 16-bit signed
  if (bitsPerSample === 8) {
    const samples = new Int16Array(end - dataOffset);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = ((buf[dataOffset + i] - 128) / 128) * 32767;
    }
    return samples;
  }

  // 24-bit signed → 16-bit
  if (bitsPerSample === 24) {
    const sampleCount = Math.floor((end - dataOffset) / 3);
    const samples = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const offset = dataOffset + i * 3;
      // Read 24-bit signed, shift down to 16-bit
      const val =
        (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16)) <<
        8;
      samples[i] = val >> 16;
    }
    return samples;
  }

  throw new Error(`Unsupported WAV bit depth: ${bitsPerSample}`);
}

// ── Audio processing (WAV → MP3 via lamejs) ──

async function encodeWavToMp3(
  wavBuffer: Buffer,
  filename: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const header = parseWavHeader(wavBuffer);
  if (!header) throw new Error("Invalid WAV file");

  const pcm = extractPcm16(wavBuffer, header);
  const { channels, sampleRate } = header;

  // @ts-expect-error lamejs has no type definitions
  const lamejs = await import("lamejs");
  const Mp3Encoder = lamejs.default?.Mp3Encoder ?? lamejs.Mp3Encoder;
  const encoder = new Mp3Encoder(channels, sampleRate, 64);

  const mp3Chunks: Uint8Array[] = [];
  const chunkSize = 1152;

  if (channels === 1) {
    for (let i = 0; i < pcm.length; i += chunkSize) {
      const chunk = pcm.subarray(i, i + chunkSize);
      const mp3buf = encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) mp3Chunks.push(new Uint8Array(mp3buf));
    }
  } else {
    // Deinterleave stereo
    const samplesPerChannel = pcm.length >> 1;
    const left = new Int16Array(samplesPerChannel);
    const right = new Int16Array(samplesPerChannel);
    for (let i = 0; i < samplesPerChannel; i++) {
      left[i] = pcm[i * 2];
      right[i] = pcm[i * 2 + 1];
    }
    for (let i = 0; i < samplesPerChannel; i += chunkSize) {
      const l = left.subarray(i, i + chunkSize);
      const r = right.subarray(i, i + chunkSize);
      const mp3buf = encoder.encodeBuffer(l, r);
      if (mp3buf.length > 0) mp3Chunks.push(new Uint8Array(mp3buf));
    }
  }

  const flush = encoder.flush();
  if (flush.length > 0) mp3Chunks.push(new Uint8Array(flush));

  const totalLength = mp3Chunks.reduce((sum, c) => sum + c.length, 0);
  const mp3Buffer = Buffer.alloc(totalLength);
  let offset = 0;
  for (const chunk of mp3Chunks) {
    mp3Buffer.set(chunk, offset);
    offset += chunk.length;
  }

  return {
    buffer: mp3Buffer,
    filename: replaceExtension(filename, ".mp3"),
  };
}

function processAudio(
  buffer: Buffer,
  filename: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (ext === ".wav") return encodeWavToMp3(buffer, filename);
  // MP3, OGG, M4A, etc. — already compressed, passthrough
  return Promise.resolve({ buffer, filename });
}

// ── Content type mapping ──

function contentTypeFor(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const map: Record<string, string> = {
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
  };
  return map[ext] ?? "application/octet-stream";
}

// ── Supabase Storage upload ──

async function uploadToStorage(
  buffer: Uint8Array,
  storagePath: string,
  contentType: string,
): Promise<string> {
  const res = await fetch(
    `${STORAGE_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer as unknown as BodyInit,
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload failed (${res.status}): ${text}`);
  }

  return `${STORAGE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

// ── Concurrency limiter ──

async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

// ── Main pipeline ──

export async function processAllMedia(
  mediaFiles: Map<string, Uint8Array>,
  topicId: string,
): Promise<MediaProcessingResult> {
  const processed: ProcessedMedia[] = [];
  const warnings: string[] = [];
  const entries = Array.from(mediaFiles.entries());

  await withConcurrency(entries, IMPORT_LIMITS.mediaConcurrency, async ([filename, raw]) => {
    try {
      const type = detectMediaType(filename);

      if (type === "skip") {
        warnings.push(`Skipped unsupported file: ${filename}`);
        return;
      }

      const buf = Buffer.from(raw);

      // Size check for audio
      if (type === "audio" && raw.length > IMPORT_LIMITS.maxAudioFileSize) {
        warnings.push(
          `Skipped oversized audio (${(raw.length / 1024 / 1024).toFixed(1)}MB): ${filename}`,
        );
        return;
      }

      let processedBuffer: Buffer;
      let processedFilename: string;

      if (type === "image") {
        const result = await optimizeImage(buf, filename);
        processedBuffer = result.buffer;
        processedFilename = result.filename;
      } else if (type === "svg") {
        // SVG passthrough
        processedBuffer = buf;
        processedFilename = filename;
      } else {
        // Audio
        const result = await processAudio(buf, filename);
        processedBuffer = result.buffer;
        processedFilename = result.filename;
      }

      const storagePath = `${topicId}/${sanitizeStorageName(processedFilename)}`;
      const contentType = contentTypeFor(processedFilename);
      const publicUrl = await uploadToStorage(
        new Uint8Array(processedBuffer),
        storagePath,
        contentType,
      );

      processed.push({
        filename,
        storagePath,
        publicUrl,
        type,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Failed to process ${filename}: ${msg}`);
    }
  });

  return { processed, warnings };
}

// ── Content URL rewriting ──

export function rewriteMediaRefs(
  content: string,
  mediaMap: Map<string, ProcessedMedia>,
): string {
  if (!content || mediaMap.size === 0) return content;

  let result = content;

  for (const [originalFilename, media] of mediaMap) {
    // Escape special regex characters in filename
    const escaped = originalFilename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Replace markdown image refs: ![alt](filename) or ![](filename)
    // Replace markdown link refs: [text](filename)
    const pattern = new RegExp(
      `(!?\\[[^\\]]*\\])\\(${escaped}\\)`,
      "g",
    );
    result = result.replace(pattern, `$1(${media.publicUrl})`);

    // Also handle bare <img src="filename"> style refs
    const imgPattern = new RegExp(
      `(<img[^>]*\\bsrc=["'])${escaped}(["'])`,
      "gi",
    );
    result = result.replace(imgPattern, `$1${media.publicUrl}$2`);

    // Handle [sound:filename] Anki-style audio refs (converted to markdown links)
    const soundPattern = new RegExp(
      `\\[sound:${escaped}\\]`,
      "g",
    );
    result = result.replace(soundPattern, `[audio](${media.publicUrl})`);
  }

  return result;
}
