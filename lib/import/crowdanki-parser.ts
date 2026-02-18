/**
 * Parse CrowdAnki .zip files (JSON-based Anki export format).
 * Extracts deck.json + media files from the ZIP.
 */

import JSZip from "jszip";
import { processNoteToFlashcards } from "./anki-templates";
import type {
  AnkiModel,
  CrowdAnkiDeck,
  CrowdAnkiNoteModel,
  ParsedCategory,
  ParsedDeck,
  ParsedFlashcard,
} from "./anki-types";
import { IMPORT_LIMITS } from "./anki-types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function crowdAnkiModelToAnkiModel(m: CrowdAnkiNoteModel): AnkiModel {
  return {
    id: m.crowdanki_uuid,
    name: m.name,
    type: m.type,
    flds: m.flds.map((f) => ({ name: f.name, ord: f.ord })),
    tmpls: m.tmpls.map((t) => ({
      name: t.name,
      ord: t.ord,
      qfmt: t.qfmt,
      afmt: t.afmt,
    })),
    css: m.css,
  };
}

/**
 * Parse a CrowdAnki .zip ArrayBuffer into a unified ParsedDeck.
 */
export async function parseCrowdAnki(buffer: ArrayBuffer): Promise<ParsedDeck> {
  const zip = await JSZip.loadAsync(buffer);
  const warnings: string[] = [];

  // Find deck.json (may be in a subdirectory)
  let deckJsonContent: string | null = null;
  let mediaPrefix = "";

  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    if (path.endsWith("deck.json")) {
      deckJsonContent = await file.async("string");
      // Media files are in the same directory as deck.json, under media/
      const dir = path.substring(0, path.lastIndexOf("/") + 1);
      mediaPrefix = dir ? `${dir}media/` : "media/";
      break;
    }
  }

  if (!deckJsonContent) {
    throw new Error("Invalid CrowdAnki archive: no deck.json found");
  }

  const deck = JSON.parse(deckJsonContent) as CrowdAnkiDeck;

  // Build model map
  const models = new Map<string, AnkiModel>();
  for (const m of deck.note_models ?? []) {
    models.set(m.crowdanki_uuid, crowdAnkiModelToAnkiModel(m));
  }

  // Also collect models from child decks
  function collectModels(d: CrowdAnkiDeck) {
    for (const m of d.note_models ?? []) {
      if (!models.has(m.crowdanki_uuid)) {
        models.set(m.crowdanki_uuid, crowdAnkiModelToAnkiModel(m));
      }
    }
    for (const child of d.children ?? []) {
      collectModels(child);
    }
  }
  collectModels(deck);

  // Extract media files from ZIP
  const mediaFiles = new Map<string, Uint8Array>();
  let mediaCount = 0;

  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    // Match files in the media directory or directly referenced media
    const isMedia = path.startsWith(mediaPrefix) || path.includes("/media/");

    if (!isMedia) continue;
    if (mediaCount >= IMPORT_LIMITS.maxMediaFiles) {
      warnings.push(
        `Media limit reached (${IMPORT_LIMITS.maxMediaFiles}). Some files were skipped.`,
      );
      break;
    }

    // Extract just the filename (last part of path)
    const filename = path.substring(path.lastIndexOf("/") + 1);
    if (!filename) continue;

    try {
      const data = await file.async("uint8array");
      mediaFiles.set(filename, data);
      mediaCount++;
    } catch {
      warnings.push(`Failed to read media file: ${path}`);
    }
  }

  // Process notes from deck + child decks
  const categoryMap = new Map<string, ParsedFlashcard[]>();
  let totalFlashcards = 0;

  function processNotes(d: CrowdAnkiDeck, parentName?: string) {
    const deckName = parentName ? `${parentName} > ${d.name}` : d.name;

    for (const note of d.notes ?? []) {
      if (totalFlashcards >= IMPORT_LIMITS.maxFlashcards) return;

      const model = models.get(note.note_model_uuid);
      if (!model) {
        warnings.push(
          `Note ${note.guid}: unknown model ${note.note_model_uuid}, skipped`,
        );
        continue;
      }

      const fieldNames = model.flds
        .sort((a, b) => a.ord - b.ord)
        .map((f) => f.name);

      const cards = processNoteToFlashcards(
        note.fields,
        fieldNames,
        model,
        note.tags ?? [],
      );

      if (cards.length === 0) continue;

      // Determine category from tags or deck name
      let categoryName = "General";
      for (const tag of note.tags ?? []) {
        const cleaned = tag.replace(/^[A-Z]+::/, "");
        if (cleaned && cleaned !== tag) {
          categoryName = cleaned.replace(/_/g, " ");
          break;
        }
      }
      if (categoryName === "General" && (note.tags?.length ?? 0) > 0) {
        const firstTag = note.tags[0].replace(/::/g, " > ").replace(/_/g, " ");
        if (firstTag.trim()) categoryName = firstTag.trim();
      }

      for (const card of cards) {
        if (totalFlashcards >= IMPORT_LIMITS.maxFlashcards) {
          warnings.push(
            `Flashcard limit reached (${IMPORT_LIMITS.maxFlashcards}). Some cards were skipped.`,
          );
          return;
        }

        // Collect media refs
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
          tags: note.tags ?? [],
          mediaRefs,
        };

        const existing = categoryMap.get(categoryName) ?? [];
        existing.push(flashcard);
        categoryMap.set(categoryName, existing);
        totalFlashcards++;
      }
    }

    // Process child decks
    for (const child of d.children ?? []) {
      processNotes(child, deckName);
    }
  }

  processNotes(deck);

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
    name: deck.name,
    description: (deck.desc ?? "")
      .replace(/<[^>]*>/g, "")
      .trim()
      .slice(0, 500),
    categories,
    warnings,
    mediaFiles,
  };
}
