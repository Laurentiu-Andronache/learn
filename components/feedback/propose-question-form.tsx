"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

interface ProposeQuestionFormProps {
  categoryId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposeQuestionForm({
  categoryId,
  open,
  onOpenChange,
}: ProposeQuestionFormProps) {
  const [questionEn, setQuestionEn] = useState("");
  const [questionEs, setQuestionEs] = useState("");
  const [explanationEn, setExplanationEn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const t = useTranslations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("proposed_questions").insert({
        category_id: categoryId || null,
        submitted_by: user?.id || null,
        type: "multiple_choice",
        question_en: questionEn,
        question_es: questionEs || questionEn,
        explanation_en: explanationEn || null,
      });
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setQuestionEn("");
        setQuestionEs("");
        setExplanationEn("");
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("feedback.proposeQuestion")}</DialogTitle>
        </DialogHeader>
        {submitted ? (
          <p className="text-center py-6 text-green-600 font-medium">
            {t("feedback.questionSubmitted")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Question (English)</Label>
              <Textarea
                value={questionEn}
                onChange={(e) => setQuestionEn(e.target.value)}
                required
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Question (Spanish, optional)</Label>
              <Textarea
                value={questionEs}
                onChange={(e) => setQuestionEs(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Explanation (optional)</Label>
              <Textarea
                value={explanationEn}
                onChange={(e) => setExplanationEn(e.target.value)}
                rows={2}
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !questionEn.trim()}
              className="w-full"
            >
              {submitting
                ? t("feedback.submitting")
                : t("feedback.proposeQuestion")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
