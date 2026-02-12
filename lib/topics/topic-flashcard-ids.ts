import type { createClient } from "@/lib/supabase/server";

/** Get all flashcard IDs belonging to a topic (categories → flashcards). */
export async function getFlashcardIdsForTopic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicId: string,
): Promise<string[]> {
  const { data: cats } = await supabase
    .from("categories")
    .select("id")
    .eq("topic_id", topicId);
  if (!cats?.length) return [];
  const catIds = cats.map((c) => c.id);
  const { data: flashcards } = await supabase
    .from("flashcards")
    .select("id")
    .in("category_id", catIds);
  return flashcards?.map((f) => f.id) ?? [];
}
