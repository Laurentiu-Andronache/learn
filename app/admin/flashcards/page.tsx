import { Suspense } from "react";
import {
  getCategoriesList,
  getFlashcardsList,
  getThemesList,
} from "@/lib/services/admin-reviews";
import { FlashcardsClient } from "./flashcards-client";

export default async function AdminFlashcardsPage() {
  const [flashcards, themes, categories] = await Promise.all([
    getFlashcardsList(),
    getThemesList(),
    getCategoriesList(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Flashcards</h1>
      <Suspense>
        <FlashcardsClient
          initialFlashcards={flashcards}
          themes={themes}
          categories={categories}
        />
      </Suspense>
    </div>
  );
}
