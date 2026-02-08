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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

interface QuestionReportFormProps {
  questionId: string;
  questionText?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuestionReportForm({
  questionId,
  questionText,
  open,
  onOpenChange,
}: QuestionReportFormProps) {
  const [issueType, setIssueType] = useState("incorrect_answer");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const t = useTranslations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const questionRef = questionText ? `\n\n[Question: ${questionText}]` : `\n\n[Question ID: ${questionId}]`;
      await supabase.from("feedback").insert({
        user_id: user?.id || null,
        type: "content",
        message: `[${issueType}] ${description.trim()}${questionRef}`,
        url: window.location.href,
        user_agent: navigator.userAgent,
      });
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setDescription("");
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("feedback.reportQuestion")}</DialogTitle>
        </DialogHeader>
        {submitted ? (
          <p className="text-center py-6 text-green-600 font-medium">
            {t("feedback.reportSubmitted")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("feedback.issueType")}</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incorrect_answer">
                    {t("feedback.incorrectAnswer")}
                  </SelectItem>
                  <SelectItem value="typo">{t("feedback.typo")}</SelectItem>
                  <SelectItem value="unclear">
                    {t("feedback.unclear")}
                  </SelectItem>
                  <SelectItem value="outdated">
                    {t("feedback.outdated")}
                  </SelectItem>
                  <SelectItem value="other">{t("feedback.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("feedback.description")}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("feedback.placeholder")}
                rows={3}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !description.trim()}
              className="w-full"
            >
              {submitting
                ? t("feedback.submitting")
                : t("feedback.submitReport")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
