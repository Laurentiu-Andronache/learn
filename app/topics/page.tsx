import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TopicGrid } from "@/components/topics/topic-grid";
import { getAllTopicsProgress } from "@/lib/fsrs/progress";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  return {
    title: locale === "es" ? "Temas - LEARN" : "Topics - LEARN",
    description:
      locale === "es"
        ? "Explora temas de salud y cognición para mejorar tu longevidad y bienestar"
        : "Explore health and cognition topics to improve your longevity and wellbeing",
    alternates: {
      canonical: `${baseUrl}/topics`,
      languages: {
        en: `${baseUrl}/topics`,
        es: `${baseUrl}/topics`,
      },
    },
  };
}

export default async function TopicsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const locale = await getLocale();
  const t = await getTranslations("topics");

  // Get all active topics with creator info
  const { data: topics } = await supabase
    .from("topics")
    .select("*, creator:profiles!creator_id(display_name)")
    .eq("is_active", true)
    .order("created_at");

  // Get progress for all topics
  const progress = await getAllTopicsProgress(user.id);

  // Get hidden topic IDs
  const { data: hidden } = await supabase
    .from("hidden_topics")
    .select("topic_id")
    .eq("user_id", user.id);
  const hiddenIds = new Set((hidden || []).map((h) => h.topic_id));

  const visibleTopics = (topics || []).filter((t) => !hiddenIds.has(t.id));

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
      <TopicGrid
        topics={visibleTopics}
        progress={progress}
        userId={user.id}
        locale={locale}
      />
    </div>
  );
}
