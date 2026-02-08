"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  QuestionEditForm,
  type QuestionEditFormData,
} from "@/components/admin/question-edit-form";
import { TranslateDialog } from "@/components/admin/translate-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAutoTranslate } from "@/hooks/use-auto-translate";
import { getQuestionById, updateQuestion } from "@/lib/services/admin-reviews";

interface QuestionEditDialogProps {
  questionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function QuestionEditDialog({
  questionId,
  open,
  onOpenChange,
  onSaved,
}: QuestionEditDialogProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionEditFormData | null>(null);
  const [questionMeta, setQuestionMeta] = useState<{
    themeName?: string;
    categoryName?: string;
  }>({});

  const originalValues = useMemo(() => {
    if (!question) return {};
    return {
      question_en: question.question_en,
      question_es: question.question_es,
      options_en: question.options_en,
      options_es: question.options_es,
      explanation_en: question.explanation_en,
      explanation_es: question.explanation_es,
      extra_en: question.extra_en,
      extra_es: question.extra_es,
    };
  }, [question]);

  const { interceptSave, dialogProps } = useAutoTranslate({
    originalValues,
    errorMessage: t("admin.translate.error"),
  });

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = await getQuestionById(questionId);
      setQuestion({
        id: q.id,
        question_en: q.question_en,
        question_es: q.question_es,
        options_en: q.options_en,
        options_es: q.options_es,
        correct_index: q.correct_index,
        explanation_en: q.explanation_en,
        explanation_es: q.explanation_es,
        extra_en: q.extra_en,
        extra_es: q.extra_es,
        type: q.type,
        difficulty: q.difficulty,
      });
      setQuestionMeta({
        themeName: q.category?.theme?.title_en,
        categoryName: q.category?.name_en,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load question");
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    if (open) loadQuestion();
  }, [open, loadQuestion]);

  const handleSave = async (updates: Record<string, unknown>) => {
    interceptSave(updates, async (finalUpdates) => {
      setSaving(true);
      setError(null);
      try {
        await updateQuestion(questionId, finalUpdates);
        onSaved?.();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin.editQuestion")}</DialogTitle>
          {questionMeta.themeName && (
            <p className="text-xs text-muted-foreground">
              {questionMeta.themeName} → {questionMeta.categoryName}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">
            {t("common.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-red-500 py-4">{error}</p>
        ) : question ? (
          <QuestionEditForm
            question={question}
            onSave={handleSave}
            onCancel={() => onOpenChange(false)}
            saving={saving}
          />
        ) : null}

        <TranslateDialog {...dialogProps} />
      </DialogContent>
    </Dialog>
  );
}
