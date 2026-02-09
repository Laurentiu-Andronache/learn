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
import { FlashcardEditForm } from "@/components/admin/flashcard-edit-form";
import { TranslateDialog } from "@/components/admin/translate-dialog";
import { Badge } from "@/components/ui/badge";
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
  deleteFlashcard,
  getFlashcardsList,
  updateFlashcard,
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
    theme_id?: string;
    theme?: { id?: string; title_en?: string };
  };
}

interface FlashcardsClientProps {
  initialFlashcards: FlashcardItem[];
  themes: Theme[];
  categories: Category[];
}

export function FlashcardsClient({
  initialFlashcards,
  themes,
  categories,
}: FlashcardsClientProps) {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const editParam = searchParams.get("edit");
  const themeParam = searchParams.get("theme");

  // Filters
  const [themeId, setThemeId] = useState<string>(themeParam || "all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Flashcards list
  const [flashcards, setFlashcards] =
    useState<FlashcardItem[]>(initialFlashcards);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-translate: compute original bilingual values for the currently-editing flashcard
  const editingOriginals = useMemo(() => {
    if (!editingId) return {};
    const f = flashcards.find((f) => f.id === editingId);
    if (!f) return {};
    return {
      question_en: f.question_en,
      question_es: f.question_es,
      answer_en: f.answer_en,
      answer_es: f.answer_es,
      extra_en: f.extra_en,
      extra_es: f.extra_es,
    };
  }, [editingId, flashcards]);

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

  // Filter categories by selected theme
  const filteredCategories = useMemo(() => {
    if (themeId === "all") return categories;
    return categories.filter((c) => c.theme_id === themeId);
  }, [themeId, categories]);

  // Reset category when theme changes
  useEffect(() => {
    setCategoryId("all");
  }, []);

  // Fetch filtered flashcards
  const fetchFlashcards = useCallback(() => {
    startTransition(async () => {
      const filters: {
        themeId?: string;
        categoryId?: string;
        search?: string;
      } = {};
      if (themeId !== "all") filters.themeId = themeId;
      if (categoryId !== "all") filters.categoryId = categoryId;
      if (debouncedSearch) filters.search = debouncedSearch;
      const data = await getFlashcardsList(filters);
      setFlashcards(data as FlashcardItem[]);
    });
  }, [themeId, categoryId, debouncedSearch]);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  const startEditing = useCallback((f: FlashcardItem) => {
    setEditingId(f.id);
  }, []);

  // Deep-link: auto-expand flashcard from ?edit= param
  useEffect(() => {
    if (!editParam || deepLinked.current) return;
    const target = flashcards.find((f) => f.id === editParam);
    if (target) {
      deepLinked.current = true;
      startEditing(target);
      setTimeout(() => {
        document
          .getElementById(`flashcard-${editParam}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [editParam, flashcards, startEditing]);

  const handleSave = async (updates: Record<string, unknown>) => {
    if (!editingId) return;
    interceptSave(updates, async (finalUpdates) => {
      setSaving(true);
      try {
        await updateFlashcard(editingId, finalUpdates);
        setEditingId(null);
        fetchFlashcards();
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDelete = async (id: string) => {
    await deleteFlashcard(id);
    fetchFlashcards();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

        <Input
          placeholder={t("admin.searchFlashcards")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isPending && (
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
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {f.answer_en}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Badge variant="secondary">D:{f.difficulty}</Badge>
              </div>
            </button>
            <p className="text-xs text-muted-foreground">
              {f.category?.theme?.title_en} → {f.category?.name_en}
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
        {flashcards.length === 0 && !isPending && (
          <p className="text-center text-muted-foreground py-8">
            {t("admin.noItems")}
          </p>
        )}
      </div>

      <TranslateDialog {...dialogProps} />
    </div>
  );
}
