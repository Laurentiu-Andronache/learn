"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [type, setType] = useState<string>("feature");
  const [message, setMessage] = useState("");
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
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("feedback").insert({
        user_id: user?.id || null,
        type,
        message: message.trim(),
        name: name.trim() || null,
        email: includeEmail && userEmail ? userEmail : null,
        url: window.location.href,
        user_agent: navigator.userAgent,
      });
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setMessage("");
        setType("feature");
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
          <DialogTitle>{t("feedback.title")}</DialogTitle>
          <DialogDescription>{t("feedback.description")}</DialogDescription>
        </DialogHeader>
        {submitted ? (
          <p className="text-center py-6 text-green-600 font-medium">
            {t("feedback.submitted")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("feedback.type")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">{t("feedback.bug")}</SelectItem>
                  <SelectItem value="feature">
                    {t("feedback.feature")}
                  </SelectItem>
                  <SelectItem value="content">
                    {t("feedback.content")}
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
              <Label>{t("feedback.message")}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("feedback.placeholder")}
                rows={4}
                required
              />
            </div>
            {userEmail && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeEmail"
                  checked={includeEmail}
                  onCheckedChange={(checked) => setIncludeEmail(checked === true)}
                />
                <Label htmlFor="includeEmail" className="text-sm font-normal cursor-pointer">
                  {t("feedback.includeEmail")} ({userEmail})
                </Label>
              </div>
            )}
            <Button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full"
            >
              {submitting ? t("feedback.sending") : t("feedback.sendFeedback")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
