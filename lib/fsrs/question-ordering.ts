import { createClient } from "@/lib/supabase/server";
import type { Question } from "@/lib/types/database";

/** Question row with joined category (PostgREST returns single object for FK) */
type QuestionWithCategoryJoin = Question & {
  categories: {
    id: string;
    name_en: string;
    name_es: string;
    color: string | null;
    theme_id: string;
  };
};

export interface OrderedQuestion {
  question: Question;
  categoryNameEn: string;
  categoryNameEs: string;
  categoryColor: string | null;
}

/**
 * Get all quiz questions for a topic, shuffled randomly.
 * Quiz mode is a simple recognition test with no FSRS or sub-modes.
 */
export async function getOrderedQuestions(
  _userId: string,
  topicId: string,
): Promise<OrderedQuestion[]> {
  const supabase = await createClient();

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select(`
      *,
      categories!inner(id, name_en, name_es, color, theme_id)
    `)
    .eq("categories.theme_id", topicId)
    .returns<QuestionWithCategoryJoin[]>();

  if (qError || !questions || questions.length === 0) return [];

  const orderedQuestions: OrderedQuestion[] = questions.map((q) => {
    const { categories: cat, ...questionFields } = q;
    return {
      question: questionFields,
      categoryNameEn: cat.name_en,
      categoryNameEs: cat.name_es,
      categoryColor: cat.color,
    };
  });

  // Shuffle (Fisher-Yates)
  for (let i = orderedQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orderedQuestions[i], orderedQuestions[j]] = [
      orderedQuestions[j],
      orderedQuestions[i],
    ];
  }

  return orderedQuestions;
}

/** Get total quiz question count for a topic */
export async function getQuizQuestionCount(topicId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("questions")
    .select("id, categories!inner(theme_id)", { count: "exact", head: true })
    .eq("categories.theme_id", topicId);
  return count ?? 0;
}
