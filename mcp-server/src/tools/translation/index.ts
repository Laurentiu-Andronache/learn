import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabaseClient } from "../../supabase.js";
import { handleCheckTranslations } from "./check.js";
import { handleFindUntranslated } from "./find-untranslated.js";
import { handleCompareTranslations } from "./compare.js";
import {
  handleUpdateTranslation,
  handleBatchUpdateTranslations,
  handleUpdateFlashcardTranslation,
  handleBatchUpdateFlashcardTranslations,
} from "./update.js";

// Re-export all handlers for direct imports (used by tests)
export { handleCheckTranslations } from "./check.js";
export { handleFindUntranslated } from "./find-untranslated.js";
export { handleCompareTranslations } from "./compare.js";
export {
  handleUpdateTranslation,
  handleBatchUpdateTranslations,
  handleUpdateFlashcardTranslation,
  handleBatchUpdateFlashcardTranslations,
} from "./update.js";

export function registerTranslationTools(server: McpServer): void {
  server.tool(
    "learn_check_translations",
    "Audit bilingual completeness for a topic. Checks topic, categories, questions, and flashcards for missing translations.",
    {
      topic_id: z.string().uuid().describe("Topic UUID to audit"),
      source_lang: z.enum(["en", "es"]).optional().describe("Source language (default 'en')"),
    },
    { readOnlyHint: true },
    async (params) => handleCheckTranslations(getSupabaseClient(), params)
  );

  server.tool(
    "learn_find_untranslated",
    "Global scan for any content missing translations across topics, categories, questions, and flashcards.",
    {
      lang: z.enum(["en", "es"]).optional().describe("Target language to check (default 'es')"),
    },
    { readOnlyHint: true },
    async (params) => handleFindUntranslated(getSupabaseClient(), params)
  );

  server.tool(
    "learn_compare_translations",
    "Side-by-side EN/ES display for translation review.",
    {
      topic_id: z.string().uuid().optional().describe("Filter by topic"),
      question_ids: z.array(z.string().uuid()).optional().describe("Specific question UUIDs"),
      flashcard_ids: z.array(z.string().uuid()).optional().describe("Specific flashcard UUIDs"),
      fields: z.array(z.string()).optional().describe("Field names to compare (e.g. 'question', 'explanation')"),
    },
    { readOnlyHint: true },
    async (params) => handleCompareTranslations(getSupabaseClient(), params)
  );

  server.tool(
    "learn_update_translation",
    "Update translation fields for a single question.",
    {
      question_id: z.string().uuid().describe("Question UUID"),
      fields: z.record(z.unknown()).describe("Translation fields to update (e.g. { question_es: '...' })"),
    },
    async (params) => handleUpdateTranslation(getSupabaseClient(), params)
  );

  server.tool(
    "learn_batch_update_translations",
    "Batch update translation fields across multiple questions.",
    {
      updates: z.array(
        z.object({
          question_id: z.string().uuid(),
          fields: z.record(z.unknown()),
        })
      ).describe("Array of { question_id, fields } objects"),
    },
    async (params) => handleBatchUpdateTranslations(getSupabaseClient(), params)
  );

  server.tool(
    "learn_update_flashcard_translation",
    "Update translation fields for a single flashcard.",
    {
      flashcard_id: z.string().uuid().describe("Flashcard UUID"),
      fields: z.record(z.unknown()).describe("Translation fields to update (e.g. { answer_es: '...' })"),
    },
    async (params) => handleUpdateFlashcardTranslation(getSupabaseClient(), params)
  );

  server.tool(
    "learn_batch_update_flashcard_translations",
    "Batch update translation fields across multiple flashcards.",
    {
      updates: z.array(
        z.object({
          flashcard_id: z.string().uuid(),
          fields: z.record(z.unknown()),
        })
      ).describe("Array of { flashcard_id, fields } objects"),
    },
    async (params) => handleBatchUpdateFlashcardTranslations(getSupabaseClient(), params)
  );
}
