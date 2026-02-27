"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useReducer, useRef } from "react";
import { toast } from "sonner";
import { IMPORT_LIMITS } from "@/lib/import/anki-types";

export type ImportState = "upload" | "preview" | "importing" | "result";

export interface PreviewData {
  deckName: string;
  cardCount: number;
  mediaCount: number;
  categoryCount: number;
}

export interface ImportResultData {
  topicId: string;
  flashcardsImported: number;
  mediaUploaded: number;
  warnings: string[];
}

interface State {
  file: File | null;
  dragOver: boolean;
  language: "en" | "es";
  makePublic: boolean;
  autoTranslate: boolean;
  state: ImportState;
  importStep: string;
  result: ImportResultData | null;
  error: string | null;
  preview: PreviewData | null;
}

type Action =
  | { type: "SET_FILE"; file: File }
  | { type: "SET_DRAG_OVER"; dragOver: boolean }
  | { type: "SET_LANGUAGE"; language: "en" | "es" }
  | { type: "SET_MAKE_PUBLIC"; makePublic: boolean }
  | { type: "SET_AUTO_TRANSLATE"; autoTranslate: boolean }
  | { type: "START_IMPORT"; importStep: string }
  | { type: "IMPORT_SUCCESS"; result: ImportResultData }
  | { type: "IMPORT_ERROR"; error: string }
  | { type: "RESET" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SET_FILE":
      return { ...s, file: a.file, error: null, result: null };
    case "SET_DRAG_OVER":
      return { ...s, dragOver: a.dragOver };
    case "SET_LANGUAGE":
      return { ...s, language: a.language };
    case "SET_MAKE_PUBLIC":
      return { ...s, makePublic: a.makePublic };
    case "SET_AUTO_TRANSLATE":
      return { ...s, autoTranslate: a.autoTranslate };
    case "START_IMPORT":
      return {
        ...s,
        state: "importing",
        error: null,
        importStep: a.importStep,
      };
    case "IMPORT_SUCCESS":
      return { ...s, state: "result", result: a.result };
    case "IMPORT_ERROR":
      return { ...s, state: "upload", error: a.error };
    case "RESET":
      return {
        ...s,
        state: "upload",
        file: null,
        error: null,
        result: null,
        preview: null,
        importStep: "",
      };
  }
}

export function useImportState() {
  const t = useTranslations("import");
  const locale = useLocale();

  const [s, dispatch] = useReducer(reducer, {
    file: null,
    dragOver: false,
    language: locale === "es" ? "es" : "en",
    makePublic: false,
    autoTranslate: false,
    state: "upload",
    importStep: "",
    result: null,
    error: null,
    preview: null,
  } satisfies State);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetLang = s.language === "en" ? "Spanish" : "English";
  const targetLangEs = s.language === "en" ? "español" : "inglés";

  const validateFile = useCallback(
    (f: File): string | null => {
      if (f.size > IMPORT_LIMITS.maxFileSize) {
        return t("fileTooLarge");
      }
      const ext = f.name.toLowerCase();
      if (!ext.endsWith(".apkg") && !ext.endsWith(".zip")) {
        return t("invalidFormat");
      }
      return null;
    },
    [t],
  );

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        toast.error(err);
        return;
      }
      dispatch({ type: "SET_FILE", file: f });
    },
    [validateFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "SET_DRAG_OVER", dragOver: true });
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "SET_DRAG_OVER", dragOver: false });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: "SET_DRAG_OVER", dragOver: false });
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        handleFile(selected);
      }
    },
    [handleFile],
  );

  const startImport = useCallback(async () => {
    if (!s.file) return;

    dispatch({ type: "START_IMPORT", importStep: t("processing") });

    try {
      const formData = new FormData();
      formData.append("file", s.file);
      formData.append("language", s.language);
      formData.append("visibility", s.makePublic ? "public" : "private");
      formData.append("autoTranslate", String(s.autoTranslate));

      const response = await fetch("/api/import/anki", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || t("error");
        dispatch({
          type: "IMPORT_ERROR",
          error: response.status === 429 ? t("rateLimited") : errorMsg,
        });
        return;
      }

      dispatch({
        type: "IMPORT_SUCCESS",
        result: {
          topicId: data.topicId,
          flashcardsImported: data.flashcardsImported,
          mediaUploaded: data.mediaUploaded,
          warnings: data.warnings || [],
        },
      });
    } catch {
      dispatch({ type: "IMPORT_ERROR", error: t("error") });
    }
  }, [s.file, s.language, s.makePublic, s.autoTranslate, t]);

  const resetForm = useCallback(() => {
    dispatch({ type: "RESET" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return {
    // State
    state: s.state,
    file: s.file,
    language: s.language,
    makePublic: s.makePublic,
    autoTranslate: s.autoTranslate,
    dragOver: s.dragOver,
    importStep: s.importStep,
    result: s.result,
    error: s.error,
    preview: s.preview,
    locale,
    targetLang,
    targetLangEs,
    fileInputRef,
    // Setters
    setLanguage: (language: "en" | "es") =>
      dispatch({ type: "SET_LANGUAGE", language }),
    setMakePublic: (makePublic: boolean) =>
      dispatch({ type: "SET_MAKE_PUBLIC", makePublic }),
    setAutoTranslate: (autoTranslate: boolean) =>
      dispatch({ type: "SET_AUTO_TRANSLATE", autoTranslate }),
    // Handlers
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
    startImport,
    resetForm,
  };
}
