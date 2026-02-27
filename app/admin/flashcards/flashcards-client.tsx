"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { FlashcardEditForm } from "@/components/admin/flashcard-edit-form";
import { TranslateDialog } from "@/components/admin/translate-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type AdminFetchParams, useAdminList } from "@/hooks/use-admin-list";
import {
  deleteFlashcard,
  getFlashcardsList,
  updateFlashcard,
} from "@/lib/services/admin-reviews";
import type { FlashcardUpdate } from "@/lib/types/database";

interface Topic {
  id: string;
  title_en: string;
}

interface Category {
  id: string;
  name_en: string;
  topic_id: string;
}

interface FlashcardItem {
  id: string;
  question_en: string;
  question_es: string | null;
  answer_en: string;
  answer_es: string | null;
  extra_en: string | null;
  extra_es: string | null;
  difficulty: number;
  category_id: string | null;
  category?: {
    id?: string;
    name_en?: string;
    topic_id?: string;
    topic?: { id?: string; title_en?: string };
  };
}

interface FlashcardsClientProps {
  initialFlashcards: FlashcardItem[];
  topics: Topic[];
  categories: Category[];
}

const getId = (f: FlashcardItem) => f.id;
const getOriginals = (f: FlashcardItem) => ({
  question_en: f.question_en,
  question_es: f.question_es,
  answer_en: f.answer_en,
  answer_es: f.answer_es,
  extra_en: f.extra_en,
  extra_es: f.extra_es,
});

const fetchFn = async (params: AdminFetchParams) => {
  return (await getFlashcardsList(params)) as FlashcardItem[];
};

const deleteFn = async (id: string) => {
  await deleteFlashcard(id);
};

export function FlashcardsClient({
  initialFlashcards,
  topics,
  categories,
}: FlashcardsClientProps) {
  const t = useTranslations();

  const updateFn = useCallback(
    async (id: string, data: Partial<FlashcardItem>) => {
      await updateFlashcard(id, data as FlashcardUpdate);
    },
    [],
  );

  const {
    topicId,
    setTopicId,
    categoryId,
    setCategoryId,
    search,
    setSearch,
    searchAnswers,
    setSearchAnswers,
    searchExtra,
    setSearchExtra,
    items: flashcards,
    loading,
    editingId,
    setEditingId,
    startEditing,
    saving,
    handleSave,
    handleDelete,
    dialogProps,
    filteredCategories,
  } = useAdminList<FlashcardItem>(
    {
      elementPrefix: "flashcard",
      fetchFn,
      updateFn,
      deleteFn,
      getId,
      getOriginals,
    },
    initialFlashcards,
    categories,
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={topicId} onValueChange={setTopicId}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t("admin.allTopics")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.allTopics")}</SelectItem>
            {topics.map((th) => (
              <SelectItem key={th.id} value={th.id}>
                {th.title_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t("admin.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.allCategories")}</SelectItem>
            {filteredCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
          <Checkbox
            checked={searchAnswers}
            onCheckedChange={(v) => setSearchAnswers(v === true)}
          />
          {t("admin.searchAnswers")}
        </label>
        <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
          <Checkbox
            checked={searchExtra}
            onCheckedChange={(v) => setSearchExtra(v === true)}
          />
          {t("admin.searchExtra")}
        </label>
        <Input
          className="flex-1 min-w-[180px]"
          placeholder={t("admin.searchFlashcards")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      )}

      {/* Flashcard list */}
      <div className="space-y-2">
        {flashcards.map((f) => (
          <div
            key={f.id}
            id={`flashcard-${f.id}`}
            className="rounded-lg border p-4 space-y-2"
          >
            <button
              type="button"
              className="flex items-start justify-between gap-4 cursor-pointer w-full text-left"
              onClick={() =>
                editingId === f.id ? setEditingId(null) : startEditing(f)
              }
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{f.question_en}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                  {f.answer_en}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Badge variant="secondary">D:{f.difficulty}</Badge>
              </div>
            </button>
            <p className="text-xs text-muted-foreground">
              {f.category?.topic?.title_en} → {f.category?.name_en}
            </p>

            {/* Inline edit form */}
            {editingId === f.id && (
              <div className="mt-3 border-t pt-3">
                <FlashcardEditForm
                  flashcard={f}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => handleDelete(f.id)}
                  saving={saving}
                />
              </div>
            )}
          </div>
        ))}
        {flashcards.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            {t("admin.noItems")}
          </p>
        )}
      </div>

      <TranslateDialog {...dialogProps} />
    </div>
  );
}
