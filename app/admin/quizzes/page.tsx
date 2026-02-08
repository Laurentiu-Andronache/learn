import { Suspense } from "react";
import {
  getCategoriesList,
  getQuestionsList,
  getThemesList,
} from "@/lib/services/admin-reviews";
import { QuestionsClient } from "./questions-client";

export default async function AdminQuizzesPage() {
  const [questions, themes, categories] = await Promise.all([
    getQuestionsList(),
    getThemesList(),
    getCategoriesList(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quiz Questions</h1>
      <Suspense>
        <QuestionsClient
          initialQuestions={questions}
          themes={themes}
          categories={categories}
        />
      </Suspense>
    </div>
  );
}
