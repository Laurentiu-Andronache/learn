import { createClient } from "@/lib/supabase/server";
import type { Flashcard, UserCardState } from "@/lib/types/database";

/** Flashcard row with joined category (PostgREST returns single object for FK) */
type FlashcardWithCategoryJoin = Flashcard & {
  categories: {
    id: string;
    name_en: string;
    name_es: string;
    color: string | null;
    topic_id: string;
  };
};

export type SubMode =
  | "full"
  | "quick_review"
  | "category_focus"
  | "spaced_repetition";

export interface OrderedFlashcard {
  flashcard: Flashcard;
  cardState: UserCardState | null;
  categoryNameEn: string;
  categoryNameEs: string;
  categoryColor: string | null;
}

export interface OrderingOptions {
  subMode: SubMode;
  categoryId?: string;
  limit?: number;
  newCardsPerDay?: number;
}

export async function getOrderedFlashcards(
  userId: string,
  topicId: string,
  options: OrderingOptions,
): Promise<OrderedFlashcard[]> {
  const supabase = await createClient();
  const now = new Date();

  // 1. Fetch all flashcards for topic with category info
  let flashcardsQuery = supabase
    .from("flashcards")
    .select(`
      *,
      categories!inner(id, name_en, name_es, color, topic_id)
    `)
    .eq("categories.topic_id", topicId);

  // Category focus filter
  if (options.subMode === "category_focus" && options.categoryId) {
    flashcardsQuery = flashcardsQuery.eq("category_id", options.categoryId);
  }

  const { data: flashcards, error: fError } =
    await flashcardsQuery.returns<FlashcardWithCategoryJoin[]>();
  if (fError || !flashcards || flashcards.length === 0) return [];

  // 2. Fetch suspended flashcards and card states in parallel
  const flashcardIds = flashcards.map((f) => f.id);
  const [{ data: suspended }, { data: cardStates }] = await Promise.all([
    supabase
      .from("suspended_flashcards")
      .select("flashcard_id")
      .eq("user_id", userId)
      .in("flashcard_id", flashcardIds),
    supabase
      .from("user_card_state")
      .select("*")
      .eq("user_id", userId)
      .in("flashcard_id", flashcardIds),
  ]);
  const suspendedSet = new Set((suspended || []).map((s) => s.flashcard_id));
  const stateMap = new Map(
    (cardStates || []).map((cs) => [cs.flashcard_id, cs]),
  );

  // 4. Build ordered list
  let orderedFlashcards: OrderedFlashcard[] = flashcards
    .filter((f) => !suspendedSet.has(f.id))
    .map((f) => {
      const { categories: cat, ...flashcardFields } = f;
      return {
        flashcard: flashcardFields,
        cardState: stateMap.get(f.id) || null,
        categoryNameEn: cat.name_en,
        categoryNameEs: cat.name_es,
        categoryColor: cat.color,
      };
    });

  // 5. Apply sub-mode filters
  switch (options.subMode) {
    case "quick_review":
      // Only cards already seen, limit 20
      orderedFlashcards = orderedFlashcards.filter(
        (of) => of.cardState !== null,
      );
      break;
    case "spaced_repetition":
      // Only genuinely due review/relearning cards (not short-term learning steps)
      orderedFlashcards = orderedFlashcards.filter((of) => {
        if (!of.cardState) return false;
        if (new Date(of.cardState.due) > now) return false;
        return (
          of.cardState.state === "review" || of.cardState.state === "relearning"
        );
      });
      break;
    // 'full' and 'category_focus' use all flashcards
  }

  // 6. Sort: genuine review due -> new cards -> learning due -> future
  // Categorize cards into priority buckets:
  // 0 = genuine review due (review/relearning state, due now)
  // 1 = new/unseen cards
  // 2 = learning cards due (short-term learning steps, recently answered)
  // 3 = future cards (not yet due)
  const getBucket = (of: OrderedFlashcard): number => {
    const cs = of.cardState;
    if (!cs) return 1; // new/unseen
    const isDue = new Date(cs.due) <= now;
    if (isDue) {
      // Genuine review: review or relearning state
      if (cs.state === "review" || cs.state === "relearning") return 0;
      // Learning state with due date = short-term learning step
      return 2;
    }
    return 3; // future
  };

  orderedFlashcards.sort((a, b) => {
    const aBucket = getBucket(a);
    const bBucket = getBucket(b);

    if (aBucket !== bBucket) return aBucket - bBucket;

    // Within genuine review bucket: most overdue first
    if (aBucket === 0) {
      return (
        new Date(a.cardState!.due).getTime() -
        new Date(b.cardState!.due).getTime()
      );
    }

    // Within learning due bucket: most overdue first
    if (aBucket === 2) {
      return (
        new Date(a.cardState!.due).getTime() -
        new Date(b.cardState!.due).getTime()
      );
    }

    // Within new or future: randomize
    return Math.random() - 0.5;
  });

  // 7. Enforce new cards per day limit
  if (options.newCardsPerDay !== undefined) {
    const todayMidnight = new Date(now);
    todayMidnight.setUTCHours(0, 0, 0, 0);

    // Count new cards already studied today (stability_before IS NULL = was new)
    const { data: todayNewLogs } = await supabase
      .from("review_logs")
      .select("flashcard_id")
      .eq("user_id", userId)
      .in("flashcard_id", flashcardIds)
      .is("stability_before", null)
      .gte("reviewed_at", todayMidnight.toISOString());

    const newCardsToday = new Set(
      (todayNewLogs || []).map((l) => l.flashcard_id),
    ).size;
    const remaining = Math.max(0, options.newCardsPerDay - newCardsToday);

    // Filter bucket 1 (new/unseen cards) to remaining allowance
    let newCardCount = 0;
    orderedFlashcards = orderedFlashcards.filter((of) => {
      if (of.cardState !== null) return true; // not a new card, keep
      newCardCount++;
      return newCardCount <= remaining;
    });
  }

  // 8. Apply limit
  if (options.limit && options.limit > 0) {
    orderedFlashcards = orderedFlashcards.slice(0, options.limit);
  }

  // Quick review default limit
  if (options.subMode === "quick_review" && !options.limit) {
    orderedFlashcards = orderedFlashcards.slice(0, 20);
  }

  return orderedFlashcards;
}

// Get counts for sub-mode selection UI
export async function getSubModeCounts(userId: string, topicId: string) {
  const supabase = await createClient();
  const now = new Date();

  const { data: flashcards } = await supabase
    .from("flashcards")
    .select("id, categories!inner(topic_id)")
    .eq("categories.topic_id", topicId)
    .returns<{ id: string; categories: { topic_id: string } }[]>();

  if (!flashcards || flashcards.length === 0) {
    return { full: 0, quickReview: 0, spacedRepetition: 0 };
  }

  const flashcardIds = flashcards.map((f) => f.id);

  const [{ data: suspended }, { data: cardStates }] = await Promise.all([
    supabase
      .from("suspended_flashcards")
      .select("flashcard_id")
      .eq("user_id", userId)
      .in("flashcard_id", flashcardIds),
    supabase
      .from("user_card_state")
      .select("flashcard_id, due, state")
      .eq("user_id", userId)
      .in("flashcard_id", flashcardIds),
  ]);
  const suspendedSet = new Set((suspended || []).map((s) => s.flashcard_id));
  const activeIds = flashcardIds.filter((id) => !suspendedSet.has(id));

  const activeCardStates = (cardStates || []).filter(
    (cs) => !suspendedSet.has(cs.flashcard_id),
  );
  const seen = activeCardStates.length;
  // Only count genuinely due review/relearning cards (not short-term learning steps)
  const dueNow = activeCardStates.filter(
    (cs) =>
      new Date(cs.due) <= now &&
      (cs.state === "review" || cs.state === "relearning"),
  ).length;

  return {
    full: activeIds.length,
    quickReview: Math.min(seen, 20),
    spacedRepetition: dueNow,
  };
}
