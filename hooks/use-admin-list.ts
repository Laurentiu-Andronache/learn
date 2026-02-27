"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  type TranslateDialogProps,
  useAutoTranslate,
} from "@/hooks/use-auto-translate";

export interface AdminFetchParams {
  topicId?: string;
  categoryId?: string;
  search?: string;
  searchAnswers?: boolean;
  searchExtra?: boolean;
}

interface UseAdminListOptions<T> {
  /** Used for deep-link scroll target: `${elementPrefix}-${id}` */
  elementPrefix: string;
  fetchFn: (params: AdminFetchParams) => Promise<T[]>;
  updateFn: (id: string, data: Partial<T>) => Promise<void>;
  deleteFn: (id: string) => Promise<void>;
  getId: (item: T) => string;
  /** Return the bilingual field pairs for auto-translate detection */
  getOriginals: (item: T) => Record<string, string | string[] | null>;
  /** Extra filter params appended to fetchFn (e.g. { type: typeFilter }) */
  extraFilters?: AdminFetchParams & Record<string, unknown>;
}

export interface UseAdminListReturn<T> {
  // Filter state
  topicId: string;
  setTopicId: (id: string) => void;
  categoryId: string;
  setCategoryId: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  searchAnswers: boolean;
  setSearchAnswers: (v: boolean) => void;
  searchExtra: boolean;
  setSearchExtra: (v: boolean) => void;
  // Data
  items: T[];
  loading: boolean;
  // Editing
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  startEditing: (item: T) => void;
  saving: boolean;
  handleSave: (updates: Partial<T>) => void;
  handleDelete: (id: string) => Promise<void>;
  // Auto-translate dialog
  dialogProps: TranslateDialogProps;
  // Category filtering helper
  filteredCategories: Array<{ id: string; name_en: string; topic_id: string }>;
}

export function useAdminList<T>(
  options: UseAdminListOptions<T>,
  initialItems: T[],
  categories: Array<{ id: string; name_en: string; topic_id: string }>,
): UseAdminListReturn<T> {
  const {
    elementPrefix,
    fetchFn,
    updateFn,
    deleteFn,
    getId,
    getOriginals,
    extraFilters,
  } = options;

  const searchParams = useSearchParams();
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const editParam = searchParams.get("edit");
  const topicParam = searchParams.get("topic");

  // Filters
  const [topicId, setTopicId] = useState<string>(topicParam || "all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchAnswers, setSearchAnswers] = useState(false);
  const [searchExtra, setSearchExtra] = useState(false);

  // Items list
  const [items, setItems] = useState<T[]>(initialItems);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-translate: compute original bilingual values for the editing item
  const editingOriginals = useMemo(() => {
    if (!editingId) return {};
    const item = items.find((i) => getId(i) === editingId);
    if (!item) return {};
    return getOriginals(item);
  }, [editingId, items, getId, getOriginals]);

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
  }, [topicId]);

  // Stable ref for extraFilters to avoid fetch re-triggers on every render
  const extraFiltersRef = useRef(extraFilters);
  extraFiltersRef.current = extraFilters;

  // Fetch filtered items
  const fetchItems = useCallback(() => {
    startTransition(async () => {
      try {
        const params: AdminFetchParams & Record<string, unknown> = {};
        if (topicId !== "all") params.topicId = topicId;
        if (categoryId !== "all") params.categoryId = categoryId;
        if (debouncedSearch) {
          params.search = debouncedSearch;
          params.searchAnswers = searchAnswers;
          params.searchExtra = searchExtra;
        }
        // Merge extra filters (e.g. type filter for questions)
        if (extraFiltersRef.current) {
          Object.assign(params, extraFiltersRef.current);
        }
        const data = await fetchFn(params);
        setItems(data);
      } catch {
        // Auth error from requireAdmin() — layout already handles access control
      }
    });
  }, [topicId, categoryId, debouncedSearch, searchAnswers, searchExtra, fetchFn]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const startEditing = useCallback(
    (item: T) => {
      setEditingId(getId(item));
    },
    [getId],
  );

  // Deep-link: auto-expand item from ?edit= param
  useEffect(() => {
    if (!editParam || deepLinked.current) return;
    const target = items.find((i) => getId(i) === editParam);
    if (target) {
      deepLinked.current = true;
      startEditing(target);
      setTimeout(() => {
        document
          .getElementById(`${elementPrefix}-${editParam}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [editParam, items, startEditing, getId, elementPrefix]);

  const handleSave = useCallback(
    (updates: Partial<T>) => {
      if (!editingId) return;
      interceptSave(
        updates as Record<string, unknown>,
        async (finalUpdates) => {
          setSaving(true);
          try {
            await updateFn(editingId, finalUpdates as Partial<T>);
            setEditingId(null);
            fetchItems();
          } finally {
            setSaving(false);
          }
        },
      );
    },
    [editingId, interceptSave, updateFn, fetchItems],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteFn(id);
        fetchItems();
      } catch {
        toast.error(t("admin.deleteFailed"));
      }
    },
    [deleteFn, fetchItems, t],
  );

  return {
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
    items,
    loading: isPending,
    editingId,
    setEditingId,
    startEditing,
    saving,
    handleSave,
    handleDelete,
    dialogProps,
    filteredCategories,
  };
}
