import { Badge } from "@/components/ui/badge";
import { getQuestionsList } from "@/lib/services/admin-reviews";

export default async function AdminQuestionsPage() {
  const questions = await getQuestionsList();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Questions</h1>
      <div className="space-y-2">
        {questions.map(
          (q: {
            id: string;
            question_en: string;
            type: string;
            difficulty: number;
            category?: {
              name_en?: string;
              theme_id?: string;
              theme?: { id?: string; title_en?: string };
            };
          }) => (
            <div key={q.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium flex-1">{q.question_en}</p>
                <div className="flex gap-1 shrink-0">
                  <Badge variant="outline">
                    {q.type === "true_false" ? "T/F" : "MC"}
                  </Badge>
                  <Badge variant="secondary">D:{q.difficulty}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {q.category?.theme?.title_en} → {q.category?.name_en}
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
