import Link from "next/link";
import { AdminTopicActions } from "@/components/admin/topic-actions";
import { TopicVisibilityToggle } from "@/components/admin/topic-visibility-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllTopics } from "@/lib/services/admin-topics";

export default async function AdminTopicsPage() {
  const topics = await getAllTopics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Topics</h1>
        <Button asChild>
          <Link href="/admin/topics/new">New Topic</Link>
        </Button>
      </div>

      <div className="space-y-3">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              {topic.icon && <span className="text-xl">{topic.icon}</span>}
              {topic.color && (
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: topic.color }}
                />
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">{topic.title_en}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {topic.title_es}
                </p>
                {topic.slug && (
                  <p className="text-xs text-muted-foreground/60 truncate font-mono">
                    /{topic.slug}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5">
                {!topic.is_active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <TopicVisibilityToggle
                topicId={topic.id}
                isPrivate={topic.visibility === "private"}
              />
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/topics/${topic.id}/edit`}>Edit</Link>
              </Button>
              <AdminTopicActions
                topicId={topic.id}
                isActive={topic.is_active ?? true}
              />
            </div>
          </div>
        ))}
        {topics.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No topics yet. Create your first topic.
          </p>
        )}
      </div>
    </div>
  );
}
