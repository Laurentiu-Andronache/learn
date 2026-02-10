import { createClient } from "@/lib/supabase/server";

/** Shape returned by Supabase when joining flashcards -> categories */
interface FlashcardWithCategory {
  id: string;
  category_id: string;
  categories: {
    id: string;
    name_en: string;
    name_es: string;
    color: string | null;
    topic_id: string;
  };
}

export interface CategoryProgress {
  categoryId: string;
  categoryNameEn: string;
  categoryNameEs: string;
  categoryColor: string | null;
  total: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
  dueToday: number;
}

export interface TopicProgress {
  topicId: string;
  total: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
  dueToday: number;
  fullyMemorized: boolean;
  lastStudied: string | null;
  percentComplete: number;
  categories: CategoryProgress[];
}

// Mastered = stability > 30 days
const MASTERY_THRESHOLD = 30;

export async function getTopicProgress(
  userId: string,
  topicId: string,
): Promise<TopicProgress> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Get all flashcards for this topic with their categories
  const { data: flashcards } = await supabase
    .from("flashcards")
    .select(`
      id,
      category_id,
      categories!inner(id, name_en, name_es, color, topic_id)
    `)
    .eq("categories.topic_id", topicId)
    .returns<FlashcardWithCategory[]>();

  if (!flashcards || flashcards.length === 0) {
    return {
      topicId,
      total: 0,
      newCount: 0,
      learningCount: 0,
      reviewCount: 0,
      masteredCount: 0,
      dueToday: 0,
      fullyMemorized: false,
      lastStudied: null,
      percentComplete: 0,
      categories: [],
    };
  }

  // Get user card states for these flashcards
  const flashcardIds = flashcards.map((f) => f.id);
  const { data: cardStates } = await supabase
    .from("user_card_state")
    .select("flashcard_id, state, stability, due, updated_at")
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds);

  const stateMap = new Map(
    (cardStates || []).map((cs) => [cs.flashcard_id, cs]),
  );

  // Get suspended flashcards to exclude
  const { data: suspended } = await supabase
    .from("suspended_flashcards")
    .select("flashcard_id")
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds);
  const suspendedSet = new Set((suspended || []).map((s) => s.flashcard_id));

  // Build category map
  const categoryMap = new Map<string, CategoryProgress>();
  let lastStudied: string | null = null;

  for (const f of flashcards) {
    if (suspendedSet.has(f.id)) continue;

    const { categories: cat } = f;
    const catId = cat.id;
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        categoryId: catId,
        categoryNameEn: cat.name_en,
        categoryNameEs: cat.name_es,
        categoryColor: cat.color,
        total: 0,
        newCount: 0,
        learningCount: 0,
        reviewCount: 0,
        masteredCount: 0,
        dueToday: 0,
      });
    }
    const catProgress = categoryMap.get(catId)!;
    catProgress.total++;

    const cs = stateMap.get(f.id);
    if (!cs) {
      catProgress.newCount++;
    } else {
      if (cs.state === "review" && cs.stability > MASTERY_THRESHOLD) {
        catProgress.masteredCount++;
      } else if (cs.state === "learning" || cs.state === "relearning") {
        catProgress.learningCount++;
      } else if (cs.state === "review") {
        catProgress.reviewCount++;
      } else {
        catProgress.newCount++;
      }
      // dueToday: only count review and relearning state
      if (
        cs.due &&
        new Date(cs.due) <= new Date(now) &&
        (cs.state === "review" || cs.state === "relearning")
      ) {
        catProgress.dueToday++;
      }
      if (cs.updated_at && (!lastStudied || cs.updated_at > lastStudied)) {
        lastStudied = cs.updated_at;
      }
    }
  }

  const categories = Array.from(categoryMap.values());
  const total = categories.reduce((s, c) => s + c.total, 0);
  const newCount = categories.reduce((s, c) => s + c.newCount, 0);
  const learningCount = categories.reduce((s, c) => s + c.learningCount, 0);
  const reviewCount = categories.reduce((s, c) => s + c.reviewCount, 0);
  const masteredCount = categories.reduce((s, c) => s + c.masteredCount, 0);
  const dueToday = categories.reduce((s, c) => s + c.dueToday, 0);
  const fullyMemorized = total > 0 && masteredCount === total && dueToday === 0;
  const percentComplete =
    total > 0 ? Math.round((masteredCount / total) * 100) : 0;

  return {
    topicId,
    total,
    newCount,
    learningCount,
    reviewCount,
    masteredCount,
    dueToday,
    fullyMemorized,
    lastStudied,
    percentComplete,
    categories,
  };
}

export async function getAllTopicsProgress(
  userId: string,
): Promise<TopicProgress[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // 1. Fetch hidden topics + active topics in parallel
  const [{ data: hiddenTopics }, activeTopicsBase] = await Promise.all([
    supabase.from("hidden_topics").select("topic_id").eq("user_id", userId),
    supabase.from("topics").select("id").eq("is_active", true),
  ]);
  const hiddenIds = new Set((hiddenTopics || []).map((h) => h.topic_id));
  const topicIds = (activeTopicsBase.data || [])
    .map((t) => t.id)
    .filter((id) => !hiddenIds.has(id));

  if (topicIds.length === 0) return [];

  // 2. Batch-fetch all flashcards, card states, and suspended in parallel
  const [
    { data: allFlashcards },
    { data: allCardStates },
    { data: allSuspended },
  ] = await Promise.all([
    supabase
      .from("flashcards")
      .select(
        "id, category_id, categories!inner(id, name_en, name_es, color, topic_id)",
      )
      .in("categories.topic_id", topicIds)
      .returns<FlashcardWithCategory[]>(),
    supabase
      .from("user_card_state")
      .select("flashcard_id, state, stability, due, updated_at")
      .eq("user_id", userId),
    supabase
      .from("suspended_flashcards")
      .select("flashcard_id")
      .eq("user_id", userId),
  ]);

  // 3. Index data for in-memory processing
  const stateMap = new Map(
    (allCardStates ?? []).map((cs) => [cs.flashcard_id, cs]),
  );
  const suspendedSet = new Set((allSuspended ?? []).map((s) => s.flashcard_id));

  // Group flashcards by topic_id
  const flashcardsByTopic = new Map<string, FlashcardWithCategory[]>();
  for (const f of allFlashcards ?? []) {
    const topicId = f.categories.topic_id;
    if (!flashcardsByTopic.has(topicId)) flashcardsByTopic.set(topicId, []);
    flashcardsByTopic.get(topicId)!.push(f);
  }

  // 4. Compute progress per topic in-memory
  return topicIds.map((topicId) => {
    const flashcards = flashcardsByTopic.get(topicId) || [];
    const categoryMap = new Map<string, CategoryProgress>();
    let lastStudied: string | null = null;

    for (const f of flashcards) {
      if (suspendedSet.has(f.id)) continue;
      const { categories: cat } = f;
      const catId = cat.id;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          categoryId: catId,
          categoryNameEn: cat.name_en,
          categoryNameEs: cat.name_es,
          categoryColor: cat.color,
          total: 0,
          newCount: 0,
          learningCount: 0,
          reviewCount: 0,
          masteredCount: 0,
          dueToday: 0,
        });
      }
      const catProgress = categoryMap.get(catId)!;
      catProgress.total++;

      const cs = stateMap.get(f.id);
      if (!cs) {
        catProgress.newCount++;
      } else {
        if (cs.state === "review" && cs.stability > MASTERY_THRESHOLD) {
          catProgress.masteredCount++;
        } else if (cs.state === "learning" || cs.state === "relearning") {
          catProgress.learningCount++;
        } else if (cs.state === "review") {
          catProgress.reviewCount++;
        } else {
          catProgress.newCount++;
        }
        // dueToday: only count review and relearning state
        if (
          cs.due &&
          new Date(cs.due) <= new Date(now) &&
          (cs.state === "review" || cs.state === "relearning")
        ) {
          catProgress.dueToday++;
        }
        if (cs.updated_at && (!lastStudied || cs.updated_at > lastStudied)) {
          lastStudied = cs.updated_at;
        }
      }
    }

    const categories = Array.from(categoryMap.values());
    const total = categories.reduce((s, c) => s + c.total, 0);
    const newCount = categories.reduce((s, c) => s + c.newCount, 0);
    const learningCount = categories.reduce((s, c) => s + c.learningCount, 0);
    const reviewCount = categories.reduce((s, c) => s + c.reviewCount, 0);
    const masteredCount = categories.reduce((s, c) => s + c.masteredCount, 0);
    const dueToday = categories.reduce((s, c) => s + c.dueToday, 0);
    const fullyMemorized =
      total > 0 && masteredCount === total && dueToday === 0;
    const percentComplete =
      total > 0 ? Math.round((masteredCount / total) * 100) : 0;

    return {
      topicId,
      total,
      newCount,
      learningCount,
      reviewCount,
      masteredCount,
      dueToday,
      fullyMemorized,
      lastStudied,
      percentComplete,
      categories,
    };
  });
}

export async function getCategoryProgress(
  userId: string,
  categoryId: string,
): Promise<CategoryProgress | null> {
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id, name_en, name_es, color")
    .eq("id", categoryId)
    .single();

  if (!category) return null;

  const { data: flashcards } = await supabase
    .from("flashcards")
    .select("id")
    .eq("category_id", categoryId);

  if (!flashcards || flashcards.length === 0) {
    return {
      categoryId,
      categoryNameEn: category.name_en,
      categoryNameEs: category.name_es,
      categoryColor: category.color,
      total: 0,
      newCount: 0,
      learningCount: 0,
      reviewCount: 0,
      masteredCount: 0,
      dueToday: 0,
    };
  }

  const flashcardIds = flashcards.map((f) => f.id);
  const now = new Date().toISOString();

  const { data: cardStates } = await supabase
    .from("user_card_state")
    .select("flashcard_id, state, stability, due")
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds);

  const stateMap = new Map(
    (cardStates || []).map((cs) => [cs.flashcard_id, cs]),
  );

  const result: CategoryProgress = {
    categoryId,
    categoryNameEn: category.name_en,
    categoryNameEs: category.name_es,
    categoryColor: category.color,
    total: flashcards.length,
    newCount: 0,
    learningCount: 0,
    reviewCount: 0,
    masteredCount: 0,
    dueToday: 0,
  };

  for (const f of flashcards) {
    const cs = stateMap.get(f.id);
    if (!cs) {
      result.newCount++;
    } else {
      if (cs.state === "review" && cs.stability > MASTERY_THRESHOLD) {
        result.masteredCount++;
      } else if (cs.state === "learning" || cs.state === "relearning") {
        result.learningCount++;
      } else if (cs.state === "review") {
        result.reviewCount++;
      } else {
        result.newCount++;
      }
      // dueToday: only count review and relearning state
      if (
        cs.due &&
        new Date(cs.due) <= new Date(now) &&
        (cs.state === "review" || cs.state === "relearning")
      ) {
        result.dueToday++;
      }
    }
  }

  return result;
}
