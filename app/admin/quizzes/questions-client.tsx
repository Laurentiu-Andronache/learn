"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { QuestionEditForm } from "@/components/admin/question-edit-form";
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
  deleteQuestion,
  getQuestionsList,
  updateQuestion,
} from "@/lib/services/admin-reviews";
import type { QuestionUpdate } from "@/lib/types/database";

interface Topic {
  id: string;
  title_en: string;
}

interface Category {
  id: string;
  name_en: string;
  topic_id: string;
}

interface QuestionItem {
  id: string;
  question_en: string;
  question_es: string | null;
  options_en: string[] | null;
  options_es: string[] | null;
  correct_index: number | null;
  explanation_en: string | null;
  explanation_es: string | null;
  extra_en: string | null;
  extra_es: string | null;
  type: string;
  difficulty: number;
  category_id: string | null;
  category?: {
    id?: string;
    name_en?: string;
    topic_id?: string;
    topic?: { id?: string; title_en?: string };
  };
}

interface QuestionsClientProps {
  initialQuestions: QuestionItem[];
  topics: Topic[];
  categories: Category[];
}

const getId = (q: QuestionItem) => q.id;
const getOriginals = (q: QuestionItem) => ({
  question_en: q.question_en,
  question_es: q.question_es,
  options_en: q.options_en,
  options_es: q.options_es,
  explanation_en: q.explanation_en,
  explanation_es: q.explanation_es,
  extra_en: q.extra_en,
  extra_es: q.extra_es,
});

export function QuestionsClient({
  initialQuestions,
  topics,
  categories,
}: QuestionsClientProps) {
  const t = useTranslations();

  // Question-specific type filter
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchFn = useCallback(
    async (params: AdminFetchParams) => {
      const filters: {
        topicId?: string;
        categoryId?: string;
        type?: string;
        search?: string;
        searchAnswers?: boolean;
        searchExtra?: boolean;
      } = { ...params };
      if (typeFilter !== "all") filters.type = typeFilter;
      return (await getQuestionsList(filters)) as QuestionItem[];
    },
    [typeFilter],
  );

  const updateFn = useCallback(
    async (id: string, data: Partial<QuestionItem>) => {
      await updateQuestion(id, data as QuestionUpdate);
    },
    [],
  );

  const deleteFn = useCallback(async (id: string) => {
    await deleteQuestion(id);
  }, []);

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
    items: questions,
    loading,
    editingId,
    setEditingId,
    startEditing,
    saving,
    handleSave,
    handleDelete,
    dialogProps,
    filteredCategories,
  } = useAdminList<QuestionItem>(
    {
      elementPrefix: "question",
      fetchFn,
      updateFn,
      deleteFn,
      getId,
      getOriginals,
    },
    initialQuestions,
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

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder={t("admin.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.allTypes")}</SelectItem>
            <SelectItem value="multiple_choice">MC</SelectItem>
            <SelectItem value="true_false">T/F</SelectItem>
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
          placeholder={t("admin.searchQuestions")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      )}

      {/* Question list */}
      <div className="space-y-2">
        {questions.map((q) => (
          <div
            key={q.id}
            id={`question-${q.id}`}
            className="rounded-lg border p-4 space-y-2"
          >
            <button
              type="button"
              className="flex items-start justify-between gap-4 cursor-pointer w-full text-left"
              onClick={() =>
                editingId === q.id ? setEditingId(null) : startEditing(q)
              }
            >
              <p className="text-sm font-medium flex-1 min-w-0 break-words">
                {q.question_en}
              </p>
              <div className="flex gap-1 shrink-0">
                <Badge variant="outline">
                  {q.type === "true_false" ? "T/F" : "MC"}
                </Badge>
                <Badge variant="secondary">D:{q.difficulty}</Badge>
              </div>
            </button>
            <p className="text-xs text-muted-foreground">
              {q.category?.topic?.title_en} → {q.category?.name_en}
            </p>

            {/* Inline edit form */}
            {editingId === q.id && (
              <div className="mt-3 border-t pt-3">
                <QuestionEditForm
                  question={q}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => handleDelete(q.id)}
                  saving={saving}
                />
              </div>
            )}
          </div>
        ))}
        {questions.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            {t("admin.noItems")}
          </p>
        )}
      </div>

      <TranslateDialog {...dialogProps} />
    </div>
  );
}
