import type { ImportTopic } from "@/lib/services/admin-import";
import { checkIsAdmin, createApiClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createApiClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = await checkIsAdmin(supabase, user.email);
  if (!isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topicId");
  if (!topicId) {
    return Response.json({ error: "Missing topicId" }, { status: 400 });
  }

  // Fetch topic
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select(
      "title_en, title_es, description_en, description_es, icon, color, slug",
    )
    .eq("id", topicId)
    .maybeSingle();

  if (topicError || !topic) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  // Fetch categories with flashcards and questions
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select(`
      name_en, name_es, slug, color,
      flashcards (
        question_en, question_es,
        answer_en, answer_es,
        extra_en, extra_es,
        difficulty
      ),
      questions (
        type, difficulty, correct_index,
        question_en, question_es,
        options_en, options_es,
        explanation_en, explanation_es,
        extra_en, extra_es
      )
    `)
    .eq("topic_id", topicId)
    .order("id");

  if (catError) {
    return Response.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }

  const exportData: ImportTopic = {
    title_en: topic.title_en,
    title_es: topic.title_es,
    description_en: topic.description_en ?? null,
    description_es: topic.description_es ?? null,
    icon: topic.icon ?? null,
    color: topic.color ?? null,
    categories: (categories ?? []).map((cat) => ({
      name_en: cat.name_en,
      name_es: cat.name_es,
      slug: cat.slug,
      color: cat.color ?? null,
      flashcards: (cat.flashcards ?? []).map((f) => ({
        question_en: f.question_en,
        question_es: f.question_es,
        answer_en: f.answer_en,
        answer_es: f.answer_es,
        extra_en: f.extra_en ?? null,
        extra_es: f.extra_es ?? null,
        difficulty: f.difficulty ?? undefined,
      })),
      questions: (cat.questions ?? []).map((q) => ({
        type: q.type,
        difficulty: q.difficulty ?? undefined,
        correct_index: q.correct_index,
        question_en: q.question_en,
        question_es: q.question_es,
        options_en: q.options_en,
        options_es: q.options_es,
        explanation_en: q.explanation_en ?? null,
        explanation_es: q.explanation_es ?? null,
        extra_en: q.extra_en ?? null,
        extra_es: q.extra_es ?? null,
      })),
    })),
  };

  const filename = `${topic.slug ?? topicId}.json`;
  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
