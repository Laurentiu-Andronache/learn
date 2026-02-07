import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrderedQuestions, getSubModeCounts } from '@/lib/fsrs/question-ordering';
import type { SubMode } from '@/lib/fsrs/question-ordering';
import { QuizSession } from '@/components/quiz/quiz-session';

interface QuizPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subMode?: string; category?: string }>;
}

export default async function QuizPage({ params, searchParams }: QuizPageProps) {
  const { id } = await params;
  const { subMode: subModeParam, category } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: theme } = await supabase
    .from('themes')
    .select('id, title_en, title_es')
    .eq('id', id)
    .single();

  if (!theme) redirect('/themes');

  // Fetch all questions (full set for sub-mode filtering on client)
  const subMode = (subModeParam as SubMode) || 'full';
  const questions = await getOrderedQuestions(user.id, id, {
    subMode,
    categoryId: category,
  });

  if (questions.length === 0 && subModeParam) redirect(`/themes/${id}`);

  // Get counts for sub-mode selector
  const counts = await getSubModeCounts(user.id, id);

  // Get categories for category focus picker
  const { data: categoriesRaw } = await supabase
    .from('categories')
    .select('id, name_en, name_es, color')
    .eq('theme_id', id)
    .order('name_en');

  const categories = (categoriesRaw || []).map(c => ({
    id: c.id,
    nameEn: c.name_en,
    nameEs: c.name_es,
    color: c.color,
    count: questions.filter(q => q.question.category_id === c.id).length,
  }));

  return (
    <QuizSession
      userId={user.id}
      themeId={id}
      themeTitleEn={theme.title_en}
      themeTitleEs={theme.title_es}
      questions={questions.map(q => ({
        question: q.question,
        categoryNameEn: q.categoryNameEn,
        categoryNameEs: q.categoryNameEs,
        categoryColor: q.categoryColor,
      }))}
      counts={counts}
      categories={categories}
      initialSubMode={subModeParam ? subMode : undefined}
    />
  );
}
