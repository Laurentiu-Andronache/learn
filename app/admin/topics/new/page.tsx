import { TopicForm } from "@/components/admin/topic-form";

export default function NewTopicPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create New Topic</h1>
      <TopicForm mode="create" />
    </div>
  );
}
