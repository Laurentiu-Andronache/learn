/**
 * Anki deck import type definitions.
 * Covers both .apkg (SQLite) and CrowdAnki (.zip JSON) formats.
 */

// ── Raw Anki model structures (from col.models JSON) ──

export interface AnkiModelField {
  name: string;
  ord: number;
}

export interface AnkiModelTemplate {
  name: string;
  ord: number;
  qfmt: string; // question format (front template)
  afmt: string; // answer format (back template)
}

export interface AnkiModel {
  id: string;
  name: string;
  type: number; // 0 = standard, 1 = cloze
  flds: AnkiModelField[];
  tmpls: AnkiModelTemplate[];
  css?: string;
}

// ── Raw note data (from SQLite or CrowdAnki JSON) ──

export interface AnkiNote {
  id: string;
  modelId: string;
  fields: string[]; // split by \x1f for .apkg, pre-split for CrowdAnki
  tags: string[];
}

// ── Raw card data (from SQLite) ──

export interface AnkiCard {
  id: string;
  noteId: string;
  deckId: string;
  ord: number; // which template generated this card
}

// ── Parsed output (unified for both formats) ──

export interface ParsedFlashcard {
  front: string; // rendered question (markdown)
  back: string; // rendered answer (markdown)
  extra: string; // extra fields concatenated (markdown)
  tags: string[];
  mediaRefs: string[]; // filenames referenced in content
}

export interface ParsedCategory {
  name: string;
  slug: string;
  flashcards: ParsedFlashcard[];
}

export interface ParsedDeck {
  name: string;
  description: string;
  categories: ParsedCategory[];
  warnings: string[];
  mediaFiles: Map<string, Uint8Array>; // filename → raw bytes
}

// ── Media processing ──

export type MediaType = "image" | "audio" | "svg" | "skip";

export interface ProcessedMedia {
  filename: string; // original filename
  storagePath: string; // path in Supabase Storage
  publicUrl: string; // public URL for content references
  type: MediaType;
}

export interface MediaProcessingResult {
  processed: ProcessedMedia[];
  warnings: string[];
}

// ── Import options ──

export interface AnkiImportOptions {
  language: "en" | "es";
  visibility: "public" | "private";
  autoTranslate: boolean; // admin-only
  userId: string;
  isAdmin: boolean;
}

// ── Import result ──

export interface AnkiImportResult {
  topicId: string;
  flashcardsImported: number;
  mediaUploaded: number;
  warnings: string[];
}

// ── CrowdAnki JSON structures ──

export interface CrowdAnkiNote {
  __type__: "Note";
  fields: string[];
  guid: string;
  note_model_uuid: string;
  tags: string[];
}

export interface CrowdAnkiNoteModel {
  __type__: "NoteModel";
  crowdanki_uuid: string;
  name: string;
  type: number;
  flds: { name: string; ord: number }[];
  tmpls: {
    name: string;
    ord: number;
    qfmt: string;
    afmt: string;
  }[];
  css?: string;
}

export interface CrowdAnkiDeck {
  __type__: "Deck";
  name: string;
  desc?: string;
  children: CrowdAnkiDeck[];
  notes: CrowdAnkiNote[];
  note_models: CrowdAnkiNoteModel[];
  media_files: string[];
  crowdanki_uuid: string;
}

// ── Limits ──

export const IMPORT_LIMITS = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFlashcards: 10_000,
  maxMediaFiles: 5_000,
  maxAudioFileSize: 2 * 1024 * 1024, // 2MB per audio file
  maxImageSize: 150 * 1024, // 150KB target for optimized images
  maxImageDimension: 800,
  importsPerHourPerUser: 5,
  mediaConcurrency: 5,
} as const;
