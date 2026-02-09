import { Suspense } from "react";
import {
  getCategoriesList,
  getQuestionsList,
  getTopicsList,
} from "@/lib/services/admin-reviews";
import { QuestionsClient } from "./questions-client";

export default async function AdminQuizzesPage() {
  const [questions, topics, categories] = await Promise.all([
    getQuestionsList(),
    getTopicsList(),
    getCategoriesList(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quiz Questions</h1>
      <Suspense>
        <QuestionsClient
          initialQuestions={questions}
          topics={topics}
          categories={categories}
        />
      </Suspense>
    </div>
  );
}
