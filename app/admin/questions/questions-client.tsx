"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getQuestionsList,
  updateQuestion,
  deleteQuestion,
} from "@/lib/services/admin-reviews";

interface Theme {
  id: string;
  title_en: string;
}

interface Category {
  id: string;
  name_en: string;
  theme_id: string;
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
    theme_id?: string;
    theme?: { id?: string; title_en?: string };
  };
}

interface QuestionsClientProps {
  initialQuestions: QuestionItem[];
  themes: Theme[];
  categories: Category[];
}

export function QuestionsClient({
  initialQuestions,
  themes,
  categories,
}: QuestionsClientProps) {
  const router = useRouter();
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  // Filters
  const [themeId, setThemeId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Questions list
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<"en" | "es">("en");
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Filter categories by selected theme
  const filteredCategories = useMemo(() => {
    if (themeId === "all") return categories;
    return categories.filter((c) => c.theme_id === themeId);
  }, [themeId, categories]);

  // Reset category when theme changes
  useEffect(() => {
    setCategoryId("all");
  }, [themeId]);

  // Fetch filtered questions
  const fetchQuestions = useCallback(() => {
    startTransition(async () => {
      const filters: { themeId?: string; categoryId?: string; type?: string; search?: string } = {};
      if (themeId !== "all") filters.themeId = themeId;
      if (categoryId !== "all") filters.categoryId = categoryId;
      if (typeFilter !== "all") filters.type = typeFilter;
      if (debouncedSearch) filters.search = debouncedSearch;
      const data = await getQuestionsList(filters);
      setQuestions(data as QuestionItem[]);
    });
  }, [themeId, categoryId, typeFilter, debouncedSearch]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const startEditing = (q: QuestionItem) => {
    setEditingId(q.id);
    setEditTab("en");
    setEditData({
      question_en: q.question_en,
      question_es: q.question_es ?? "",
      options_en: q.options_en ?? [],
      options_es: q.options_es ?? [],
      correct_index: q.correct_index ?? 0,
      explanation_en: q.explanation_en ?? "",
      explanation_es: q.explanation_es ?? "",
      extra_en: q.extra_en ?? "",
      extra_es: q.extra_es ?? "",
      difficulty: q.difficulty,
      type: q.type,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { ...editData };
      // Clean empty strings to null
      for (const key of ["question_es", "explanation_en", "explanation_es", "extra_en", "extra_es"]) {
        if (updates[key] === "") updates[key] = null;
      }
      await updateQuestion(editingId, updates);
      setEditingId(null);
      fetchQuestions();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteQuestion(id);
    fetchQuestions();
  };

  const updateOption = (lang: "en" | "es", index: number, value: string) => {
    const key = lang === "en" ? "options_en" : "options_es";
    const options = [...((editData[key] as string[]) || [])];
    options[index] = value;
    setEditData({ ...editData, [key]: options });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select value={themeId} onValueChange={setThemeId}>
          <SelectTrigger>
            <SelectValue placeholder={t("admin.allTopics")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.allTopics")}</SelectItem>
            {themes.map((th) => (
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

        <Input
          placeholder={t("admin.searchQuestions")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      )}

      {/* Question list */}
      <div className="space-y-2">
        {questions.map((q) => (
          <div key={q.id} className="rounded-lg border p-4 space-y-2">
            <div
              className="flex items-start justify-between gap-4 cursor-pointer"
              onClick={() => editingId === q.id ? setEditingId(null) : startEditing(q)}
              onKeyDown={(e) => { if (e.key === "Enter") editingId === q.id ? setEditingId(null) : startEditing(q); }}
              role="button"
              tabIndex={0}
            >
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

            {/* Inline edit form */}
            {editingId === q.id && (
              <div className="mt-3 space-y-4 border-t pt-3">
                {/* EN/ES tabs */}
                <div className="flex gap-2">
                  <Button
                    variant={editTab === "en" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditTab("en")}
                  >
                    EN
                  </Button>
                  <Button
                    variant={editTab === "es" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditTab("es")}
                  >
                    ES
                  </Button>
                </div>

                {/* Question text */}
                <div className="space-y-2">
                  <Label>{editTab === "en" ? "Question (EN)" : "Question (ES)"}</Label>
                  <Textarea
                    value={(editData[`question_${editTab}`] as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, [`question_${editTab}`]: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <Label>Options ({editTab.toUpperCase()})</Label>
                  {((editData[`options_${editTab}`] as string[]) || []).map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-xs font-mono w-5">{String.fromCharCode(65 + i)}</span>
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(editTab, i, e.target.value)}
                      />
                      {i === (editData.correct_index as number) && (
                        <Badge variant="outline" className="text-green-600 border-green-600 shrink-0">
                          ✓
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* Correct index */}
                <div className="space-y-2">
                  <Label>Correct Index</Label>
                  <Input
                    type="number"
                    min={0}
                    max={((editData.options_en as string[]) || []).length - 1}
                    value={editData.correct_index as number}
                    onChange={(e) =>
                      setEditData({ ...editData, correct_index: parseInt(e.target.value) || 0 })
                    }
                    className="w-20"
                  />
                </div>

                {/* Explanation */}
                <div className="space-y-2">
                  <Label>Explanation ({editTab.toUpperCase()})</Label>
                  <Textarea
                    value={(editData[`explanation_${editTab}`] as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, [`explanation_${editTab}`]: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                {/* Extra */}
                <div className="space-y-2">
                  <Label>Extra / Learn More ({editTab.toUpperCase()})</Label>
                  <Textarea
                    value={(editData[`extra_${editTab}`] as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, [`extra_${editTab}`]: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                {/* Shared fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Difficulty (1-10)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={editData.difficulty as number}
                      onChange={(e) =>
                        setEditData({ ...editData, difficulty: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={editData.type as string}
                      onValueChange={(v) => setEditData({ ...editData, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">MC</SelectItem>
                        <SelectItem value="true_false">T/F</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    {saving ? t("common.loading") : t("admin.saveQuestion")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    {t("admin.cancelEdit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => handleDelete(q.id)}
                  >
                    {t("admin.delete")}
                  </Button>
                </div>
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
    </div>
  );
}
