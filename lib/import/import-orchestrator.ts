/**
 * Import orchestrator: detects format, routes to correct parser,
 * processes media, inserts into DB.
 */

import JSZip from "jszip";
import type {
  AnkiImportOptions,
  AnkiImportResult,
  ParsedDeck,
  ProcessedMedia,
} from "./anki-types";
import { IMPORT_LIMITS } from "./anki-types";
import { parseApkg } from "./anki-parser";
import { parseCrowdAnki } from "./crowdanki-parser";
import { processAllMedia, rewriteMediaRefs } from "./anki-media";
import { importAnkiDeck } from "./anki-db-insert";

type DeckFormat = "apkg" | "crowdanki" | "unknown";

/**
 * Detect format by inspecting ZIP contents.
 */
async function detectFormat(buffer: ArrayBuffer): Promise<DeckFormat> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const filenames = Object.keys(zip.files);

    // .apkg: has collection.anki21 or collection.anki2
    if (
      filenames.some(
        (f) => f === "collection.anki21" || f === "collection.anki2",
      )
    ) {
      return "apkg";
    }

    // CrowdAnki: has deck.json (possibly in a subdirectory)
    if (filenames.some((f) => f.endsWith("deck.json"))) {
      return "crowdanki";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Validate ZIP magic bytes (first 4 bytes should be PK\x03\x04).
 */
function isZipFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const view = new DataView(buffer);
  return (
    view.getUint8(0) === 0x50 && // P
    view.getUint8(1) === 0x4b && // K
    view.getUint8(2) === 0x03 &&
    view.getUint8(3) === 0x04
  );
}

/**
 * Main import entry point.
 * Accepts a raw file buffer + options, returns import result.
 */
export async function importAnkiFile(
  buffer: ArrayBuffer,
  options: AnkiImportOptions,
): Promise<AnkiImportResult> {
  // Validate file size
  if (buffer.byteLength > IMPORT_LIMITS.maxFileSize) {
    throw new Error(
      `File too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB exceeds ${IMPORT_LIMITS.maxFileSize / 1024 / 1024}MB limit`,
    );
  }

  // Validate ZIP magic bytes
  if (!isZipFile(buffer)) {
    throw new Error("Invalid file: not a valid ZIP/APKG file");
  }

  // Detect format
  const format = await detectFormat(buffer);
  if (format === "unknown") {
    throw new Error(
      "Unrecognized format: file must be an Anki .apkg or CrowdAnki .zip",
    );
  }

  // Parse based on format
  let parsed: ParsedDeck;
  if (format === "apkg") {
    parsed = await parseApkg(buffer);
  } else {
    parsed = await parseCrowdAnki(buffer);
  }

  const warnings = [...parsed.warnings];

  // Validate counts
  const totalFlashcards = parsed.categories.reduce(
    (sum, cat) => sum + cat.flashcards.length,
    0,
  );
  if (totalFlashcards === 0) {
    throw new Error("No flashcards could be extracted from this deck");
  }
  if (totalFlashcards > IMPORT_LIMITS.maxFlashcards) {
    warnings.push(
      `Deck contained more than ${IMPORT_LIMITS.maxFlashcards} cards. Only the first ${IMPORT_LIMITS.maxFlashcards} were imported.`,
    );
  }

  // Process and upload media
  let mediaUploaded = 0;
  let mediaMap = new Map<string, ProcessedMedia>();

  if (parsed.mediaFiles.size > 0) {
    // We need a topic ID for media storage path - generate a temp one,
    // the actual insert will use this same ID
    const topicId = crypto.randomUUID();
    const mediaResult = await processAllMedia(parsed.mediaFiles, topicId);
    warnings.push(...mediaResult.warnings);
    mediaUploaded = mediaResult.processed.length;

    // Build lookup map: original filename → processed media info
    for (const pm of mediaResult.processed) {
      mediaMap.set(pm.filename, pm);
    }

    // Rewrite media references in all flashcard content
    for (const category of parsed.categories) {
      for (const flashcard of category.flashcards) {
        flashcard.front = rewriteMediaRefs(flashcard.front, mediaMap);
        flashcard.back = rewriteMediaRefs(flashcard.back, mediaMap);
        flashcard.extra = rewriteMediaRefs(flashcard.extra, mediaMap);
      }
    }

    // Insert into DB with this specific topic ID
    const result = await importAnkiDeck(parsed, options, topicId);
    return {
      ...result,
      mediaUploaded,
      warnings,
    };
  }

  // No media - just insert
  const result = await importAnkiDeck(parsed, options);
  return {
    ...result,
    mediaUploaded: 0,
    warnings,
  };
}
