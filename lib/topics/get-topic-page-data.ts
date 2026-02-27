import { getTopicProgress } from "@/lib/fsrs/progress";
import { getQuizSummary } from "@/lib/services/quiz-attempts";
import { createClient } from "@/lib/supabase/server";

export async function getTopicPageData(topicId: string, userId: string) {
  const supabase = await createClient();

  const [progress, { count: quizQuestionCount }, quizSummary] =
    await Promise.all([
      getTopicProgress(userId, topicId),
      supabase
        .from("questions")
        .select("id, categories!inner(topic_id)", {
          count: "exact",
          head: true,
        })
        .eq("categories.topic_id", topicId),
      getQuizSummary(topicId),
    ]);

  return { progress, quizQuestionCount, quizSummary };
}
