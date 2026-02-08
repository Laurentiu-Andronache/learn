import { createClient } from "@/lib/supabase/server";
import type { Question, UserCardState } from "@/lib/types/database";

export type SubMode =
  | "full"
  | "quick_review"
  | "category_focus"
  | "spaced_repetition";

export interface OrderedQuestion {
  question: Question;
  cardState: UserCardState | null;
  categoryNameEn: string;
  categoryNameEs: string;
  categoryColor: string | null;
}

export interface OrderingOptions {
  subMode: SubMode;
  categoryId?: string;
  limit?: number;
}

export async function getOrderedQuestions(
  userId: string,
  themeId: string,
  options: OrderingOptions,
): Promise<OrderedQuestion[]> {
  const supabase = await createClient();
  const now = new Date();

  // 1. Fetch all questions for theme with category info
  let questionsQuery = supabase
    .from("questions")
    .select(`
      *,
      categories!inner(id, name_en, name_es, color, theme_id)
    `)
    .eq("categories.theme_id", themeId);

  // Category focus filter
  if (options.subMode === "category_focus" && options.categoryId) {
    questionsQuery = questionsQuery.eq("category_id", options.categoryId);
  }

  const { data: questions, error: qError } = await questionsQuery;
  if (qError || !questions || questions.length === 0) return [];

  // 2. Fetch suspended questions and card states in parallel
  const questionIds = questions.map((q) => q.id);
  const [{ data: suspended }, { data: cardStates }] = await Promise.all([
    supabase
      .from("suspended_questions")
      .select("question_id")
      .eq("user_id", userId)
      .in("question_id", questionIds),
    supabase
      .from("user_card_state")
      .select("*")
      .eq("user_id", userId)
      .in("question_id", questionIds),
  ]);
  const suspendedSet = new Set((suspended || []).map((s) => s.question_id));
  const stateMap = new Map(
    (cardStates || []).map((cs) => [cs.question_id, cs]),
  );

  // 4. Build ordered list
  let orderedQuestions: OrderedQuestion[] = questions
    .filter((q) => !suspendedSet.has(q.id))
    .map((q) => {
      const cat = q.categories as {
        id: string;
        name_en: string;
        name_es: string;
        color: string | null;
        theme_id: string;
      };
      return {
        question: {
          id: q.id,
          category_id: q.category_id,
          type: q.type,
          question_en: q.question_en,
          question_es: q.question_es,
          options_en: q.options_en,
          options_es: q.options_es,
          correct_index: q.correct_index,
          explanation_en: q.explanation_en,
          explanation_es: q.explanation_es,
          extra_en: q.extra_en,
          extra_es: q.extra_es,
          difficulty: q.difficulty,
          created_at: q.created_at,
          updated_at: q.updated_at,
        } as Question,
        cardState: stateMap.get(q.id) || null,
        categoryNameEn: cat.name_en,
        categoryNameEs: cat.name_es,
        categoryColor: cat.color,
      };
    });

  // 5. Apply sub-mode filters
  switch (options.subMode) {
    case "quick_review":
      // Only cards already seen, limit 20
      orderedQuestions = orderedQuestions.filter((oq) => oq.cardState !== null);
      break;
    case "spaced_repetition":
      // Only genuinely due review/relearning cards (not short-term learning steps)
      orderedQuestions = orderedQuestions.filter((oq) => {
        if (!oq.cardState) return false;
        if (new Date(oq.cardState.due) > now) return false;
        return oq.cardState.state === "review" || oq.cardState.state === "relearning";
      });
      break;
    // 'full' and 'category_focus' use all questions
  }

  // 6. Sort: genuine review due → new cards → learning due → future
  // Categorize cards into priority buckets:
  // 0 = genuine review due (review/relearning state, due now)
  // 1 = new/unseen cards
  // 2 = learning cards due (short-term learning steps, recently answered)
  // 3 = future cards (not yet due)
  const getBucket = (oq: OrderedQuestion): number => {
    const cs = oq.cardState;
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

  orderedQuestions.sort((a, b) => {
    const aBucket = getBucket(a);
    const bBucket = getBucket(b);

    if (aBucket !== bBucket) return aBucket - bBucket;

    // Within genuine review bucket: most overdue first
    if (aBucket === 0) {
      return new Date(a.cardState!.due).getTime() - new Date(b.cardState!.due).getTime();
    }

    // Within learning due bucket: most overdue first
    if (aBucket === 2) {
      return new Date(a.cardState!.due).getTime() - new Date(b.cardState!.due).getTime();
    }

    // Within new or future: randomize
    return Math.random() - 0.5;
  });

  // 7. Apply limit
  if (options.limit && options.limit > 0) {
    orderedQuestions = orderedQuestions.slice(0, options.limit);
  }

  // Quick review default limit
  if (options.subMode === "quick_review" && !options.limit) {
    orderedQuestions = orderedQuestions.slice(0, 20);
  }

  return orderedQuestions;
}

// Get counts for sub-mode selection UI
export async function getSubModeCounts(userId: string, themeId: string) {
  const supabase = await createClient();
  const now = new Date();

  const { data: questions } = await supabase
    .from("questions")
    .select("id, categories!inner(theme_id)")
    .eq("categories.theme_id", themeId);

  if (!questions || questions.length === 0) {
    return { full: 0, quickReview: 0, spacedRepetition: 0 };
  }

  const questionIds = questions.map((q) => q.id);

  const [{ data: suspended }, { data: cardStates }] = await Promise.all([
    supabase
      .from("suspended_questions")
      .select("question_id")
      .eq("user_id", userId)
      .in("question_id", questionIds),
    supabase
      .from("user_card_state")
      .select("question_id, due, state")
      .eq("user_id", userId)
      .in("question_id", questionIds),
  ]);
  const suspendedSet = new Set((suspended || []).map((s) => s.question_id));
  const activeIds = questionIds.filter((id) => !suspendedSet.has(id));

  const activeCardStates = (cardStates || []).filter(
    (cs) => !suspendedSet.has(cs.question_id),
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
