/**
 * Insert parsed Anki deck into Supabase as a Learn topic.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  AnkiImportOptions,
  AnkiImportResult,
  ParsedDeck,
} from "./anki-types";

/**
 * Insert a parsed Anki deck into the database.
 * Creates topic + categories + flashcards.
 */
export async function importAnkiDeck(
  deck: ParsedDeck,
  options: AnkiImportOptions,
  presetTopicId?: string,
): Promise<AnkiImportResult> {
  const supabase = await createClient();
  const warnings: string[] = [];

  const lang = options.language;
  const otherLang = lang === "en" ? "es" : "en";

  // Insert topic
  const topicData: Record<string, unknown> = {
    [`title_${lang}`]: deck.name,
    [`title_${otherLang}`]: deck.name, // same name for both until translated
    [`description_${lang}`]: deck.description || null,
    [`description_${otherLang}`]: deck.description || null,
    icon: "📚",
    is_active: true,
    creator_id: options.userId,
    visibility: options.visibility,
  };

  if (presetTopicId) {
    topicData.id = presetTopicId;
  }

  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .insert(topicData)
    .select("id")
    .single();

  if (topicErr) {
    throw new Error(`Topic insert failed: ${topicErr.message}`);
  }

  let totalFlashcards = 0;

  // Insert categories and flashcards
  for (const category of deck.categories) {
    const { data: cat, error: catErr } = await supabase
      .from("categories")
      .insert({
        topic_id: topic.id,
        [`name_${lang}`]: category.name,
        [`name_${otherLang}`]: category.name,
        slug: category.slug,
      })
      .select("id")
      .single();

    if (catErr) {
      warnings.push(
        `Category "${category.name}" insert failed: ${catErr.message}`,
      );
      continue;
    }

    // Batch insert flashcards (Supabase has a row limit, chunk at 500)
    const BATCH_SIZE = 500;
    for (let i = 0; i < category.flashcards.length; i += BATCH_SIZE) {
      const batch = category.flashcards.slice(i, i + BATCH_SIZE);
      const rows = batch.map((fc) => ({
        category_id: cat.id,
        [`question_${lang}`]: fc.front,
        [`question_${otherLang}`]: fc.front, // duplicate until translated
        [`answer_${lang}`]: fc.back,
        [`answer_${otherLang}`]: fc.back,
        [`extra_${lang}`]: fc.extra || null,
        [`extra_${otherLang}`]: fc.extra || null,
        difficulty: 5,
      }));

      const { error: fcErr } = await supabase.from("flashcards").insert(rows);

      if (fcErr) {
        warnings.push(
          `Flashcard batch insert for "${category.name}" failed: ${fcErr.message}`,
        );
      } else {
        totalFlashcards += batch.length;
      }
    }
  }

  // Revalidate paths
  revalidatePath("/topics");
  revalidatePath("/admin/topics");
  revalidatePath("/admin/flashcards");

  return {
    topicId: topic.id,
    flashcardsImported: totalFlashcards,
    mediaUploaded: 0,
    warnings,
  };
}
