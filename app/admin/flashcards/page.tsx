import { Suspense } from "react";
import {
  getCategoriesList,
  getFlashcardsList,
  getTopicsList,
} from "@/lib/services/admin-reviews";
import { FlashcardsClient } from "./flashcards-client";

export default async function AdminFlashcardsPage() {
  const [flashcards, topics, categories] = await Promise.all([
    getFlashcardsList(),
    getTopicsList(),
    getCategoriesList(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Flashcards</h1>
      <Suspense>
        <FlashcardsClient
          initialFlashcards={flashcards}
          topics={topics}
          categories={categories}
        />
      </Suspense>
    </div>
  );
}
