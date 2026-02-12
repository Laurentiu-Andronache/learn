"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { useAutoTranslate } from "@/hooks/use-auto-translate";
import {
  deleteQuestion,
  getQuestionsList,
  updateQuestion,
} from "@/lib/services/admin-reviews";

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

export function QuestionsClient({
  initialQuestions,
  topics,
  categories,
}: QuestionsClientProps) {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const editParam = searchParams.get("edit");
  const topicParam = searchParams.get("topic");

  // Filters
  const [topicId, setTopicId] = useState<string>(topicParam || "all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchAnswers, setSearchAnswers] = useState(false);
  const [searchExtra, setSearchExtra] = useState(false);

  // Questions list
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-translate: compute original bilingual values for the currently-editing question
  const editingOriginals = useMemo(() => {
    if (!editingId) return {};
    const q = questions.find((q) => q.id === editingId);
    if (!q) return {};
    return {
      question_en: q.question_en,
      question_es: q.question_es,
      options_en: q.options_en,
      options_es: q.options_es,
      explanation_en: q.explanation_en,
      explanation_es: q.explanation_es,
      extra_en: q.extra_en,
      extra_es: q.extra_es,
    };
  }, [editingId, questions]);

  const { interceptSave, dialogProps } = useAutoTranslate({
    originalValues: editingOriginals,
    errorMessage: t("admin.translate.error"),
  });

  // Deep-link tracking
  const deepLinked = useRef(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Filter categories by selected topic
  const filteredCategories = useMemo(() => {
    if (topicId === "all") return categories;
    return categories.filter((c) => c.topic_id === topicId);
  }, [topicId, categories]);

  // Reset category when topic changes
  useEffect(() => {
    setCategoryId("all");
  }, []);

  // Fetch filtered questions
  const fetchQuestions = useCallback(() => {
    startTransition(async () => {
      try {
        const filters: {
          topicId?: string;
          categoryId?: string;
          type?: string;
          search?: string;
          searchAnswers?: boolean;
          searchExtra?: boolean;
        } = {};
        if (topicId !== "all") filters.topicId = topicId;
        if (categoryId !== "all") filters.categoryId = categoryId;
        if (typeFilter !== "all") filters.type = typeFilter;
        if (debouncedSearch) {
          filters.search = debouncedSearch;
          filters.searchAnswers = searchAnswers;
          filters.searchExtra = searchExtra;
        }
        const data = await getQuestionsList(filters);
        setQuestions(data as QuestionItem[]);
      } catch {
        // Auth error from requireAdmin() — layout already handles access control
      }
    });
  }, [topicId, categoryId, typeFilter, debouncedSearch, searchAnswers, searchExtra]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const startEditing = useCallback((q: QuestionItem) => {
    setEditingId(q.id);
  }, []);

  // Deep-link: auto-expand question from ?edit= param
  useEffect(() => {
    if (!editParam || deepLinked.current) return;
    const target = questions.find((q) => q.id === editParam);
    if (target) {
      deepLinked.current = true;
      startEditing(target);
      setTimeout(() => {
        document
          .getElementById(`question-${editParam}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [editParam, questions, startEditing]);

  const handleSave = async (updates: Record<string, unknown>) => {
    if (!editingId) return;
    interceptSave(updates, async (finalUpdates) => {
      setSaving(true);
      try {
        await updateQuestion(editingId, finalUpdates);
        setEditingId(null);
        fetchQuestions();
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDelete = async (id: string) => {
    await deleteQuestion(id);
    fetchQuestions();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={topicId} onValueChange={setTopicId}>
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
              <SelectValue placeholder={t("admin.allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allTypes")}</SelectItem>
              <SelectItem value="multiple_choice">MC</SelectItem>
              <SelectItem value="true_false">T/F</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
      </div>

      {isPending && (
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
              <p className="text-sm font-medium flex-1 min-w-0 break-words">{q.question_en}</p>
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
        {questions.length === 0 && !isPending && (
          <p className="text-center text-muted-foreground py-8">
            {t("admin.noItems")}
          </p>
        )}
      </div>

      <TranslateDialog {...dialogProps} />
    </div>
  );
}
