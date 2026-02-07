import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrderedQuestions } from "@/lib/fsrs/question-ordering";
import type { SubMode } from "@/lib/fsrs/question-ordering";
import { FlashcardSession } from "@/components/flashcards/flashcard-session";

interface FlashcardsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; category?: string }>;
}

export default async function FlashcardsPage({ params, searchParams }: FlashcardsPageProps) {
  const { id } = await params;
  const { mode, category } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: theme } = await supabase
    .from("themes")
    .select("id, title_en, title_es")
    .eq("id", id)
    .single();

  if (!theme) redirect("/themes");

  const subMode = (mode as SubMode) || "full";
  const questions = await getOrderedQuestions(user.id, id, {
    subMode,
    categoryId: category,
  });

  if (questions.length === 0) redirect("/themes");

  return (
    <FlashcardSession
      userId={user.id}
      themeId={id}
      themeTitleEn={theme.title_en}
      themeTitleEs={theme.title_es}
      questions={questions.map((q) => ({
        id: q.question.id,
        question_en: q.question.question_en,
        question_es: q.question.question_es,
        explanation_en: q.question.explanation_en,
        explanation_es: q.question.explanation_es,
        extra_en: q.question.extra_en,
        extra_es: q.question.extra_es,
        categoryNameEn: q.categoryNameEn,
        categoryNameEs: q.categoryNameEs,
        categoryColor: q.categoryColor,
      }))}
    />
  );
}
