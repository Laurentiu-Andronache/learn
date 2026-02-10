import { redirect } from "next/navigation";
import { FlashcardSession } from "@/components/flashcards/flashcard-session";
import type { SubMode } from "@/lib/fsrs/flashcard-ordering";
import { getOrderedFlashcards } from "@/lib/fsrs/flashcard-ordering";
import { getFsrsSettings } from "@/lib/services/user-preferences";
import { createClient } from "@/lib/supabase/server";

interface FlashcardsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; category?: string }>;
}

export default async function FlashcardsPage({
  params,
  searchParams,
}: FlashcardsPageProps) {
  const { id } = await params;
  const { mode, category } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: adminRow }, { data: topic }, fsrsSettings] = await Promise.all(
    [
      supabase
        .from("admin_users")
        .select("id")
        .eq("email", user.email!)
        .maybeSingle(),
      supabase
        .from("topics")
        .select("id, title_en, title_es")
        .eq("id", id)
        .single(),
      getFsrsSettings(user.id),
    ],
  );

  const isAdmin = !!adminRow;
  if (!topic) redirect("/topics");

  const subMode = (mode as SubMode) || "full";
  const ordered = await getOrderedFlashcards(user.id, id, {
    subMode,
    categoryId: category,
    newCardsPerDay: fsrsSettings.new_cards_per_day,
  });

  if (ordered.length === 0) redirect("/topics");

  return (
    <FlashcardSession
      userId={user.id}
      topicId={id}
      topicTitleEn={topic.title_en}
      topicTitleEs={topic.title_es}
      isAdmin={isAdmin}
      fsrsSettings={fsrsSettings}
      flashcards={ordered.map((o) => ({
        id: o.flashcard.id,
        question_en: o.flashcard.question_en,
        question_es: o.flashcard.question_es,
        answer_en: o.flashcard.answer_en,
        answer_es: o.flashcard.answer_es,
        extra_en: o.flashcard.extra_en,
        extra_es: o.flashcard.extra_es,
        categoryNameEn: o.categoryNameEn,
        categoryNameEs: o.categoryNameEs,
        categoryColor: o.categoryColor,
        cardState: o.cardState,
      }))}
    />
  );
}
