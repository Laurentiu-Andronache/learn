import { redirect } from "next/navigation";
import { QuizSession } from "@/components/quiz/quiz-session";
import { getCorrectQuestionIds } from "@/lib/services/quiz-attempts";
import { createClient } from "@/lib/supabase/server";

interface QuizPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function QuizPage({ params, searchParams }: QuizPageProps) {
  const { id } = await params;
  const { mode } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", user.email!)
    .maybeSingle();
  const isAdmin = !!adminRow;

  const { data: topic } = await supabase
    .from("themes")
    .select("id, title_en, title_es")
    .eq("id", id)
    .single();

  if (!topic) redirect("/topics");

  // Fetch all questions for this topic via categories join
  const { data: questionsRaw } = await supabase
    .from("questions")
    .select(
      "*, category:categories!inner(id, name_en, name_es, color, theme_id)",
    )
    .eq("category.theme_id", id);

  let filtered = questionsRaw || [];

  // In "remaining" mode, exclude questions already answered correctly
  if (mode === "remaining") {
    const correctIds = new Set(await getCorrectQuestionIds(user.id, id));
    filtered = filtered.filter((q) => !correctIds.has(q.id));
    if (filtered.length === 0) redirect(`/topics/${id}`);
  }

  const questions = shuffleArray(filtered);

  if (questions.length === 0) redirect(`/topics/${id}`);

  return (
    <QuizSession
      userId={user.id}
      topicId={id}
      topicTitleEn={topic.title_en}
      topicTitleEs={topic.title_es}
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
