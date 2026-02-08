import { getQuestionsList, getThemesList, getCategoriesList } from "@/lib/services/admin-reviews";
import { QuestionsClient } from "./questions-client";

export default async function AdminQuestionsPage() {
  const [questions, themes, categories] = await Promise.all([
    getQuestionsList(),
    getThemesList(),
    getCategoriesList(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Questions</h1>
      <QuestionsClient
        initialQuestions={questions}
        themes={themes}
        categories={categories}
      />
    </div>
  );
}
