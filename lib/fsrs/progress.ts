import { createClient } from '@/lib/supabase/server';

export interface CategoryProgress {
  categoryId: string;
  categoryNameEn: string;
  categoryNameEs: string;
  categoryColor: string | null;
  total: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
  dueToday: number;
}

export interface ThemeProgress {
  themeId: string;
  total: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
  dueToday: number;
  fullyMemorized: boolean;
  lastStudied: string | null;
  percentComplete: number;
  categories: CategoryProgress[];
}

// Mastered = stability > 30 days
const MASTERY_THRESHOLD = 30;

export async function getThemeProgress(userId: string, themeId: string): Promise<ThemeProgress> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Get all questions for this theme with their categories
  const { data: questions } = await supabase
    .from('questions')
    .select(`
      id,
      category_id,
      categories!inner(id, name_en, name_es, color, theme_id)
    `)
    .eq('categories.theme_id', themeId);

  if (!questions || questions.length === 0) {
    return {
      themeId, total: 0, newCount: 0, learningCount: 0, reviewCount: 0,
      masteredCount: 0, dueToday: 0, fullyMemorized: false, lastStudied: null,
      percentComplete: 0, categories: [],
    };
  }

  // Get user card states for these questions
  const questionIds = questions.map(q => q.id);
  const { data: cardStates } = await supabase
    .from('user_card_state')
    .select('question_id, state, stability, due, updated_at')
    .eq('user_id', userId)
    .in('question_id', questionIds);

  const stateMap = new Map((cardStates || []).map(cs => [cs.question_id, cs]));

  // Get suspended questions to exclude
  const { data: suspended } = await supabase
    .from('suspended_questions')
    .select('question_id')
    .eq('user_id', userId)
    .in('question_id', questionIds);
  const suspendedSet = new Set((suspended || []).map(s => s.question_id));

  // Build category map
  const categoryMap = new Map<string, CategoryProgress>();
  let lastStudied: string | null = null;

  for (const q of questions) {
    if (suspendedSet.has(q.id)) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = (q as any).categories;
    const catId = cat.id;
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        categoryId: catId,
        categoryNameEn: cat.name_en,
        categoryNameEs: cat.name_es,
        categoryColor: cat.color,
        total: 0, newCount: 0, learningCount: 0, reviewCount: 0,
        masteredCount: 0, dueToday: 0,
      });
    }
    const catProgress = categoryMap.get(catId)!;
    catProgress.total++;

    const cs = stateMap.get(q.id);
    if (!cs) {
      catProgress.newCount++;
    } else {
      if (cs.state === 'review' && cs.stability > MASTERY_THRESHOLD) {
        catProgress.masteredCount++;
      } else if (cs.state === 'learning' || cs.state === 'relearning') {
        catProgress.learningCount++;
      } else if (cs.state === 'review') {
        catProgress.reviewCount++;
      } else {
        catProgress.newCount++;
      }
      if (cs.due && new Date(cs.due) <= new Date(now)) {
        catProgress.dueToday++;
      }
      if (cs.updated_at && (!lastStudied || cs.updated_at > lastStudied)) {
        lastStudied = cs.updated_at;
      }
    }
  }

  const categories = Array.from(categoryMap.values());
  const total = categories.reduce((s, c) => s + c.total, 0);
  const newCount = categories.reduce((s, c) => s + c.newCount, 0);
  const learningCount = categories.reduce((s, c) => s + c.learningCount, 0);
  const reviewCount = categories.reduce((s, c) => s + c.reviewCount, 0);
  const masteredCount = categories.reduce((s, c) => s + c.masteredCount, 0);
  const dueToday = categories.reduce((s, c) => s + c.dueToday, 0);
  const fullyMemorized = total > 0 && masteredCount === total && dueToday === 0;
  const percentComplete = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

  return {
    themeId, total, newCount, learningCount, reviewCount, masteredCount,
    dueToday, fullyMemorized, lastStudied, percentComplete, categories,
  };
}

export async function getAllThemesProgress(userId: string): Promise<ThemeProgress[]> {
  const supabase = await createClient();

  // Get all active, non-hidden themes
  const { data: hiddenThemes } = await supabase
    .from('hidden_themes')
    .select('theme_id')
    .eq('user_id', userId);
  const hiddenIds = (hiddenThemes || []).map(h => h.theme_id);

  let query = supabase.from('themes').select('id').eq('is_active', true);
  if (hiddenIds.length > 0) {
    query = query.not('id', 'in', `(${hiddenIds.join(',')})`);
  }
  const { data: themes } = await query;

  if (!themes || themes.length === 0) return [];

  const results = await Promise.all(
    themes.map(t => getThemeProgress(userId, t.id))
  );
  return results;
}

export async function getCategoryProgress(userId: string, categoryId: string): Promise<CategoryProgress | null> {
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('id, name_en, name_es, color')
    .eq('id', categoryId)
    .single();

  if (!category) return null;

  const { data: questions } = await supabase
    .from('questions')
    .select('id')
    .eq('category_id', categoryId);

  if (!questions || questions.length === 0) {
    return {
      categoryId, categoryNameEn: category.name_en, categoryNameEs: category.name_es,
      categoryColor: category.color, total: 0, newCount: 0, learningCount: 0,
      reviewCount: 0, masteredCount: 0, dueToday: 0,
    };
  }

  const questionIds = questions.map(q => q.id);
  const now = new Date().toISOString();

  const { data: cardStates } = await supabase
    .from('user_card_state')
    .select('question_id, state, stability, due')
    .eq('user_id', userId)
    .in('question_id', questionIds);

  const stateMap = new Map((cardStates || []).map(cs => [cs.question_id, cs]));

  const result: CategoryProgress = {
    categoryId, categoryNameEn: category.name_en, categoryNameEs: category.name_es,
    categoryColor: category.color, total: questions.length, newCount: 0,
    learningCount: 0, reviewCount: 0, masteredCount: 0, dueToday: 0,
  };

  for (const q of questions) {
    const cs = stateMap.get(q.id);
    if (!cs) {
      result.newCount++;
    } else {
      if (cs.state === 'review' && cs.stability > MASTERY_THRESHOLD) {
        result.masteredCount++;
      } else if (cs.state === 'learning' || cs.state === 'relearning') {
        result.learningCount++;
      } else if (cs.state === 'review') {
        result.reviewCount++;
      } else {
        result.newCount++;
      }
      if (cs.due && new Date(cs.due) <= new Date(now)) {
        result.dueToday++;
      }
    }
  }

  return result;
}
