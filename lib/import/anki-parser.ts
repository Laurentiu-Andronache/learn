/**
 * Parse .apkg files (standard Anki export format).
 * Bypasses anki-reader's readAnkiPackage (which only reads collection.anki2)
 * and manually extracts collection.anki21 from the ZIP for full compatibility.
 */

import JSZip from "jszip";
import { processNoteToFlashcards } from "./anki-templates";
import type {
  AnkiModel,
  AnkiNote,
  ParsedCategory,
  ParsedDeck,
  ParsedFlashcard,
} from "./anki-types";
import { IMPORT_LIMITS } from "./anki-types";
import { slugify } from "./utils";

/**
 * Parse an .apkg ArrayBuffer into a unified ParsedDeck.
 */
export async function parseApkg(buffer: ArrayBuffer): Promise<ParsedDeck> {
  const { readAnkiCollection } = await import("anki-reader");
  const fs = await import("node:fs");
  const path = await import("node:path");

  // sql.js needs the WASM binary
  const wasmPath = path.join(process.cwd(), "public", "sql-wasm.wasm");
  const wasmBinary = fs.readFileSync(wasmPath);

  // Extract ZIP contents manually (anki-reader only reads collection.anki2)
  const zip = await JSZip.loadAsync(buffer);
  const filenames = Object.keys(zip.files);

  // Pick the best collection file: anki21 > anki2
  let collectionFilename = "collection.anki21";
  if (!filenames.includes(collectionFilename)) {
    collectionFilename = "collection.anki2";
  }

  const collectionFile = zip.files[collectionFilename];
  if (!collectionFile) {
    throw new Error("No collection database found in .apkg file");
  }

  const collectionArrayBuffer = await collectionFile.async("arraybuffer");
  const collectionBuffer = new Uint8Array(collectionArrayBuffer);

  // Use anki-reader's readAnkiCollection to parse the SQLite database
  const collection = await readAnkiCollection(collectionBuffer, {
    sqlConfig: { wasmBinary },
  });

  const warnings: string[] = [];

  // Extract models (note types) from the col table
  const rawModels = collection.getModels();
  const models = new Map<string, AnkiModel>();

  // getModels() may return an array or a record keyed by ID
  const modelEntries: [string, Record<string, unknown>][] = Array.isArray(
    rawModels,
  )
    ? rawModels.map((m: Record<string, unknown>) => [
        String(m.id ?? m.mid ?? ""),
        m,
      ])
    : (Object.entries(rawModels as Record<string, unknown>) as [
        string,
        Record<string, unknown>,
      ][]);

  for (const [id, raw] of modelEntries) {
    // anki-reader wraps model data in a `modelJson` property
    const wrapper = raw as Record<string, unknown>;
    const m = (wrapper.modelJson ?? wrapper) as Record<string, unknown>;
    const flds = (m.flds ?? []) as { name: string; ord: number }[];
    const tmpls = (m.tmpls ?? []) as {
      name: string;
      ord: number;
      qfmt: string;
      afmt: string;
    }[];

    if (!Array.isArray(flds) || !Array.isArray(tmpls)) {
      warnings.push(`Model ${id}: invalid fields or templates, skipped`);
      continue;
    }

    models.set(id, {
      id,
      name: String(m.name ?? "Unknown"),
      type: Number(m.type ?? 0),
      flds: flds.map((f) => ({ name: f.name, ord: f.ord })),
      tmpls: tmpls.map((t) => ({
        name: t.name,
        ord: t.ord,
        qfmt: t.qfmt,
        afmt: t.afmt,
      })),
      css: m.css as string | undefined,
    });
  }

  // Extract deck names
  const rawDecks = collection.getDecks();
  let deckName = "Imported Deck";
  const deckEntries = Array.isArray(rawDecks)
    ? rawDecks
    : Object.values(rawDecks as Record<string, unknown>);
  for (const deck of deckEntries) {
    const d = deck as { getName?: () => string; name?: string };
    const name = typeof d.getName === "function" ? d.getName() : d.name;
    if (name && name !== "Default") {
      deckName = name;
      break;
    }
  }

  // Query notes from SQLite
  const db = collection.getRawCollection();
  const noteRows = db.exec("SELECT id, mid, flds, tags FROM notes");
  const notes: AnkiNote[] = [];

  if (noteRows.length > 0) {
    for (const row of noteRows[0].values) {
      const [id, mid, flds, tags] = row as [number, number, string, string];
      notes.push({
        id: String(id),
        modelId: String(mid),
        fields: (flds ?? "").split("\x1f"),
        tags: (tags ?? "")
          .trim()
          .split(/\s+/)
          .filter((t) => t.length > 0),
      });
    }
  }

  // Extract media: parse the `media` JSON mapping + read numbered files
  const mediaFiles = new Map<string, Uint8Array>();
  let mediaMapping: Record<string, string> = {};

  const mediaJsonFile = zip.files["media"];
  if (mediaJsonFile) {
    try {
      const mediaJsonStr = await mediaJsonFile.async("string");
      mediaMapping = JSON.parse(mediaJsonStr);
    } catch {
      warnings.push("Failed to parse media mapping JSON");
    }
  }

  // Map numbered files to their real filenames
  for (const [numKey, realFilename] of Object.entries(mediaMapping)) {
    if (mediaFiles.size >= IMPORT_LIMITS.maxMediaFiles) {
      warnings.push(
        `Media limit reached (${IMPORT_LIMITS.maxMediaFiles}). Some media files were skipped.`,
      );
      break;
    }

    const file = zip.files[numKey];
    if (!file || file.dir) continue;

    try {
      const data = await file.async("uint8array");
      mediaFiles.set(realFilename, data);
    } catch {
      warnings.push(`Failed to read media file: ${numKey} (${realFilename})`);
    }
  }

  // Build flashcards grouped by tags → categories
  const categoryMap = new Map<string, ParsedFlashcard[]>();
  let totalFlashcards = 0;

  for (const note of notes) {
    const model = models.get(note.modelId);
    if (!model) {
      warnings.push(`Note ${note.id}: unknown model ${note.modelId}, skipped`);
      continue;
    }

    const fieldNames = model.flds
      .sort((a, b) => a.ord - b.ord)
      .map((f) => f.name);

    const cards = processNoteToFlashcards(
      note.fields,
      fieldNames,
      model,
      note.tags,
    );

    if (cards.length === 0) continue;

    // Determine category from tags (use first hierarchical tag, or "General")
    let categoryName = "General";
    for (const tag of note.tags) {
      const cleaned = tag.replace(/^[A-Z]+::/, "");
      if (cleaned && cleaned !== tag) {
        categoryName = cleaned.replace(/_/g, " ");
        break;
      }
    }
    if (categoryName === "General" && note.tags.length > 0) {
      const firstTag = note.tags[0].replace(/::/g, " > ").replace(/_/g, " ");
      if (firstTag.trim()) categoryName = firstTag.trim();
    }

    for (const card of cards) {
      if (totalFlashcards >= IMPORT_LIMITS.maxFlashcards) {
        warnings.push(
          `Flashcard limit reached (${IMPORT_LIMITS.maxFlashcards}). Some cards were skipped.`,
        );
        break;
      }

      const mediaRefs: string[] = [];
      const imgRegex = /!\[.*?\]\(([^)]+)\)/g;
      const audioRegex = /\[audio\]\(([^)]+)\)/g;
      for (const content of [card.front, card.back, card.extra]) {
        for (const match of content.matchAll(imgRegex))
          mediaRefs.push(match[1]);
        for (const match of content.matchAll(audioRegex))
          mediaRefs.push(match[1]);
      }

      const flashcard: ParsedFlashcard = {
        front: card.front,
        back: card.back,
        extra: card.extra,
        tags: note.tags,
        mediaRefs,
      };

      const existing = categoryMap.get(categoryName) ?? [];
      existing.push(flashcard);
      categoryMap.set(categoryName, existing);
      totalFlashcards++;
    }

    if (totalFlashcards >= IMPORT_LIMITS.maxFlashcards) break;
  }

  // Build categories
  const categories: ParsedCategory[] = [];
  for (const [name, flashcards] of categoryMap) {
    categories.push({
      name,
      slug: slugify(name),
      flashcards,
    });
  }

  categories.sort((a, b) => b.flashcards.length - a.flashcards.length);

  return {
    name: deckName,
    description: "",
    categories,
    warnings,
    mediaFiles,
  };
}
