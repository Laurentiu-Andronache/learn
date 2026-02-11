import { redirect } from "next/navigation";
import { ReadingView } from "@/components/reading/reading-view";
import { getReadingProgress } from "@/lib/services/user-preferences";
import { createClient } from "@/lib/supabase/server";
import {
  isUuidParam,
  resolveTopicSelect,
} from "@/lib/topics/resolve-topic";
import { topicUrl } from "@/lib/topics/topic-url";

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

  const topic = await resolveTopicSelect<{
    id: string;
    title_en: string;
    title_es: string;
    intro_text_en: string | null;
    intro_text_es: string | null;
    slug: string | null;
  }>(id, "id, title_en, title_es, intro_text_en, intro_text_es, slug");

  if (!topic) redirect("/topics");

  // Canonical redirect: UUID in URL but topic has a slug
  if (topic.slug && isUuidParam(id)) {
    redirect(topicUrl(topic, "reading"));
  }

  const progress = await getReadingProgress(user.id, topic.id).catch(() => []);

  return (
    <ReadingView
      userId={user.id}
      topic={topic}
      progress={progress}
      isAdmin={isAdmin}
    />
  );
}
