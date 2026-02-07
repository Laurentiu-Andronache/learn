import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAllThemesProgress } from '@/lib/fsrs/progress';
import { ThemeGrid } from '@/components/themes/theme-grid';

export const metadata = { title: 'Themes - LEARN' };

export default async function ThemesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Get all active themes
  const { data: themes } = await supabase
    .from('themes')
    .select('*')
    .eq('is_active', true)
    .order('created_at');

  // Get progress for all themes
  const progress = await getAllThemesProgress(user.id);

  // Get hidden theme IDs
  const { data: hidden } = await supabase
    .from('hidden_themes')
    .select('theme_id')
    .eq('user_id', user.id);
  const hiddenIds = new Set((hidden || []).map(h => h.theme_id));

  const visibleThemes = (themes || []).filter(t => !hiddenIds.has(t.id));

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Your Themes</h1>
      <ThemeGrid themes={visibleThemes} progress={progress} userId={user.id} />
    </div>
  );
}
