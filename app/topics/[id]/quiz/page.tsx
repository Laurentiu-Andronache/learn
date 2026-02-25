import { redirect } from "next/navigation";
import { AutoGuestLogin } from "@/components/auth/auto-guest-login";
import { QuizSession } from "@/components/quiz/quiz-session";
import { getCorrectQuestionIds } from "@/lib/services/quiz-attempts";
import { getFsrsSettings } from "@/lib/services/user-preferences";
import { shuffleArray } from "@/lib/shuffle";
import { checkIsAdmin, createClient } from "@/lib/supabase/server";
import { isUuidParam, resolveTopicSelect } from "@/lib/topics/resolve-topic";
import { topicUrl } from "@/lib/topics/topic-url";

interface QuizPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export default async function QuizPage({
  params,
  searchParams,
}: QuizPageProps) {
  const { id } = await params;
  const { mode } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <AutoGuestLogin />;

  const isAdmin = await checkIsAdmin(supabase, user.email!);

  const topic = await resolveTopicSelect<{
    id: string;
    title_en: string;
    title_es: string;
    slug: string | null;
  }>(id, "id, title_en, title_es, slug");

  if (!topic) redirect("/topics");

  // Canonical redirect: UUID in URL but topic has a slug
  if (topic.slug && isUuidParam(id)) {
    redirect(topicUrl(topic, "quiz"));
  }

  // Fetch all questions for this topic via categories join
  const { data: questionsRaw } = await supabase
    .from("questions")
    .select(
      "*, category:categories!inner(id, name_en, name_es, color, topic_id)",
    )
    .eq("category.topic_id", topic.id);

  let filtered = questionsRaw || [];

  // In "remaining" mode, exclude questions already answered correctly
  if (mode === "remaining") {
    const correctIds = new Set(await getCorrectQuestionIds(user.id, topic.id));
    filtered = filtered.filter((q) => !correctIds.has(q.id));
    if (filtered.length === 0) redirect(topicUrl(topic));
  }

  const questions = shuffleArray(filtered);

  if (questions.length === 0) redirect(topicUrl(topic));

  const fsrsSettings = await getFsrsSettings(user.id);

  return (
    <QuizSession
      userId={user.id}
      topicId={topic.id}
      topicTitleEn={topic.title_en}
      topicTitleEs={topic.title_es}
      fsrsSettings={fsrsSettings}
      questions={questions.map((q) => {
        const cat = q.category as unknown as {
          id: string;
          name_en: string;
          name_es: string;
          color: string | null;
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
          },
          categoryNameEn: cat.name_en,
          categoryNameEs: cat.name_es,
          categoryColor: cat.color,
        };
      })}
      isAdmin={isAdmin}
    />
  );
}
