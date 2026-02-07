import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReadingProgress } from "@/lib/services/user-preferences";
import { ReadingView } from "@/components/reading/reading-view";

interface ReadingPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadingPage({ params }: ReadingPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: theme } = await supabase
    .from("themes")
    .select("id, title_en, title_es, intro_text_en, intro_text_es")
    .eq("id", id)
    .single();

  if (!theme) redirect("/themes");

  const progress = await getReadingProgress(user.id, id).catch(() => []);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (
    <ReadingView
      userId={user.id}
      theme={theme as any}
      progress={progress as any}
    />
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
