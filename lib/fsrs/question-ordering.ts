import { shuffleArray } from "@/lib/shuffle";
import {
  CATEGORY_JOIN_SELECT,
  CATEGORY_TOPIC_ONLY_SELECT,
  type CategoryJoin,
} from "@/lib/supabase/category-select";
import { createClient } from "@/lib/supabase/server";
import type { Question } from "@/lib/types/database";

type QuestionWithCategoryJoin = Question & { categories: CategoryJoin };

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
    .select(`*, ${CATEGORY_JOIN_SELECT}`)
    .eq("categories.topic_id", topicId)
    .returns<QuestionWithCategoryJoin[]>();

  if (qError || !questions || questions.length === 0) return [];

  return shuffleArray(
    questions.map((q) => {
      const { categories: cat, ...questionFields } = q;
      return {
        question: questionFields,
        categoryNameEn: cat.name_en,
        categoryNameEs: cat.name_es,
        categoryColor: cat.color,
      };
    }),
  );
}

/** Get total quiz question count for a topic */
export async function getQuizQuestionCount(topicId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("questions")
    .select(`id, ${CATEGORY_TOPIC_ONLY_SELECT}`, { count: "exact", head: true })
    .eq("categories.topic_id", topicId);
  return count ?? 0;
}
