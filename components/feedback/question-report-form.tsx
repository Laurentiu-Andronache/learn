"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [name, setName] = useState("");
  const [includeEmail, setIncludeEmail] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const t = useTranslations();

  useEffect(() => {
    if (!open) return;
    const fetchEmail = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    };
    fetchEmail();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const questionRef = questionText ? `\n\n[Question: ${questionText}]` : `\n\n[Question ID: ${questionId}]`;
      await supabase.from("feedback").insert({
        user_id: user.id,
        type: "content",
        message: `[${issueType}] ${description.trim()}${questionRef}`,
        name: name.trim() || null,
        email: includeEmail && userEmail ? userEmail : null,
        question_id: questionId,
        url: window.location.href,
        user_agent: navigator.userAgent,
      });
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setDescription("");
        setName("");
        setIncludeEmail(false);
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
              <Label>{t("feedback.name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("feedback.namePlaceholder")}
              />
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
            {userEmail && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeEmailReport"
                  checked={includeEmail}
                  onCheckedChange={(checked) => setIncludeEmail(checked === true)}
                />
                <Label htmlFor="includeEmailReport" className="text-sm font-normal cursor-pointer">
                  {t("feedback.includeEmail")} ({userEmail})
                </Label>
              </div>
            )}
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
