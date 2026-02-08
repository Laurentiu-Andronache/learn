import { redirect } from "next/navigation";
import { ReadingView } from "@/components/reading/reading-view";
import { getReadingProgress } from "@/lib/services/user-preferences";
import { createClient } from "@/lib/supabase/server";

interface ReadingPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadingPage({ params }: ReadingPageProps) {
  const { id } = await params;
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
    .select("id, title_en, title_es, intro_text_en, intro_text_es")
    .eq("id", id)
    .single();

  if (!topic) redirect("/topics");

  const progress = await getReadingProgress(user.id, id).catch(() => []);

  return (
    <ReadingView
      userId={user.id}
      theme={topic}
      progress={progress}
      isAdmin={isAdmin}
    />
  );
}
