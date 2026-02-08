import { notFound } from "next/navigation";
import { TopicForm } from "@/components/admin/topic-form";
import { getTopicById } from "@/lib/services/admin-topics";

export default async function EditTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let topic: Awaited<ReturnType<typeof getTopicById>>;
  try {
    topic = await getTopicById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Topic</h1>
      <TopicForm
        mode="edit"
        topicId={id}
        defaultValues={{
          title_en: topic.title_en,
          title_es: topic.title_es,
          description_en: topic.description_en,
          description_es: topic.description_es,
          icon: topic.icon,
          color: topic.color,
          intro_text_en: topic.intro_text_en,
          intro_text_es: topic.intro_text_es,
          is_active: topic.is_active ?? true,
        }}
      />
    </div>
  );
}
