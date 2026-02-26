"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
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

export function useImportState() {
  const t = useTranslations("import");
  const locale = useLocale();

  const [state, setState] = useState<ImportState>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<"en" | "es">(
    locale === "es" ? "es" : "en",
  );
  const [makePublic, setMakePublic] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importStep, setImportStep] = useState("");
  const [result, setResult] = useState<ImportResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetLang = language === "en" ? "Spanish" : "English";
  const targetLangEs = language === "en" ? "español" : "inglés";

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
      setFile(f);
      setError(null);
      setResult(null);
    },
    [validateFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
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
    if (!file) return;

    setState("importing");
    setError(null);
    setImportStep(t("processing"));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);
      formData.append("visibility", makePublic ? "public" : "private");
      formData.append("autoTranslate", String(autoTranslate));

      const response = await fetch("/api/import/anki", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || t("error");
        if (response.status === 429) {
          setError(t("rateLimited"));
        } else {
          setError(errorMsg);
        }
        setState("upload");
        return;
      }

      setResult({
        topicId: data.topicId,
        flashcardsImported: data.flashcardsImported,
        mediaUploaded: data.mediaUploaded,
        warnings: data.warnings || [],
      });
      setState("result");
    } catch {
      setError(t("error"));
      setState("upload");
    }
  }, [file, language, makePublic, autoTranslate, t]);

  const resetForm = useCallback(() => {
    setState("upload");
    setFile(null);
    setError(null);
    setResult(null);
    setPreview(null);
    setImportStep("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return {
    // State
    state,
    file,
    language,
    makePublic,
    autoTranslate,
    dragOver,
    importStep,
    result,
    error,
    preview,
    locale,
    targetLang,
    targetLangEs,
    fileInputRef,
    // Setters
    setLanguage,
    setMakePublic,
    setAutoTranslate,
    // Handlers
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
    startImport,
    resetForm,
  };
}
