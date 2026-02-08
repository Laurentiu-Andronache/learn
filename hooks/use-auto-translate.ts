"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { translateFields } from "@/lib/services/admin-translate";

type FieldValues = Record<string, unknown>;

interface UseAutoTranslateOptions {
  originalValues: FieldValues;
  /** i18n error message for translation failure toast */
  errorMessage?: string;
}

export interface TranslateDialogProps {
  open: boolean;
  targetLang: "en" | "es" | null;
  translating: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}

/**
 * Detects which bilingual fields changed and offers auto-translation.
 * - Only EN changed → offer translate to ES
 * - Only ES changed → offer translate to EN
 * - Both or neither → save as-is (no prompt)
 */
export function useAutoTranslate({ originalValues, errorMessage }: UseAutoTranslateOptions) {
  const [open, setOpen] = useState(false);
  const [targetLang, setTargetLang] = useState<"en" | "es" | null>(null);
  const [translating, setTranslating] = useState(false);

  // Store pending save state in refs to avoid stale closures
  const pendingValues = useRef<FieldValues | null>(null);
  const pendingDoSave = useRef<((vals: FieldValues) => Promise<void>) | null>(null);
  const originalsRef = useRef(originalValues);
  originalsRef.current = originalValues;

  const detectChangedLangs = useCallback(
    (current: FieldValues): { en: boolean; es: boolean } => {
      const orig = originalsRef.current;
      let enChanged = false;
      let esChanged = false;

      for (const key of Object.keys(current)) {
        if (!key.endsWith("_en") && !key.endsWith("_es")) continue;
        const origVal = orig[key];
        const curVal = current[key];

        // Normalize for comparison: null/undefined/""/[] are equivalent empties
        const norm = (v: unknown) => {
          if (v === null || v === undefined || v === "") return "";
          if (Array.isArray(v)) return v.length === 0 ? "" : JSON.stringify(v);
          return String(v);
        };

        if (norm(origVal) !== norm(curVal)) {
          if (key.endsWith("_en")) enChanged = true;
          if (key.endsWith("_es")) esChanged = true;
        }
      }
      return { en: enChanged, es: esChanged };
    },
    [],
  );

  const interceptSave = useCallback(
    (currentValues: FieldValues, doSave: (vals: FieldValues) => Promise<void>) => {
      const { en, es } = detectChangedLangs(currentValues);

      // Both changed or neither → save directly
      if ((en && es) || (!en && !es)) {
        doSave(currentValues);
        return;
      }

      // Store for later use by confirm/decline
      pendingValues.current = currentValues;
      pendingDoSave.current = doSave;
      setTargetLang(en ? "es" : "en");
      setOpen(true);
    },
    [detectChangedLangs],
  );

  const onConfirm = useCallback(async () => {
    const values = pendingValues.current;
    const doSave = pendingDoSave.current;
    if (!values || !doSave) return;

    setTranslating(true);
    try {
      const sourceLang: "en" | "es" = targetLang === "es" ? "en" : "es";
      const suffix = `_${sourceLang}`;

      // Collect source fields for translation
      const sourceFields: Record<string, string | string[] | null> = {};
      for (const [key, value] of Object.entries(values)) {
        if (!key.endsWith(suffix)) continue;
        sourceFields[key] = value as string | string[] | null;
      }

      const result = await translateFields({
        fields: sourceFields,
        sourceLang,
        targetLang: targetLang!,
      });

      if (result.error) {
        toast.error(errorMessage || "Translation failed. Saved without translating.");
        setOpen(false);
        await doSave(values);
        return;
      }

      // Map translated keys: replace source suffix with target suffix
      const merged = { ...values };
      for (const [sourceKey, translatedValue] of Object.entries(result.data ?? {})) {
        const targetKey = sourceKey.replace(
          new RegExp(`_${sourceLang}$`),
          `_${targetLang}`,
        );
        merged[targetKey] = translatedValue;
      }

      setOpen(false);
      await doSave(merged);
    } catch (err) {
      // Shouldn't happen since server action returns errors, but just in case
      console.warn("Auto-translate failed:", err);
      toast.error(errorMessage || "Translation failed. Saved without translating.");
      setOpen(false);
      await doSave(values);
    } finally {
      setTranslating(false);
      pendingValues.current = null;
      pendingDoSave.current = null;
    }
  }, [targetLang, errorMessage]);

  const onDecline = useCallback(async () => {
    const values = pendingValues.current;
    const doSave = pendingDoSave.current;
    setOpen(false);
    pendingValues.current = null;
    pendingDoSave.current = null;
    if (values && doSave) await doSave(values);
  }, []);

  const dialogProps: TranslateDialogProps = {
    open,
    targetLang,
    translating,
    onConfirm,
    onDecline,
  };

  return { interceptSave, dialogProps };
}
