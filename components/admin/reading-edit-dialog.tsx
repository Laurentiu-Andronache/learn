"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TranslateDialog } from "@/components/admin/translate-dialog";
import { useAutoTranslate } from "@/hooks/use-auto-translate";
import { getTopicById, updateTopicIntroText } from "@/lib/services/admin-topics";

interface ReadingEditDialogProps {
  themeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function ReadingEditDialog({
  themeId,
  open,
  onOpenChange,
  onSaved,
}: ReadingEditDialogProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<"en" | "es">("en");
  const [topicTitle, setTopicTitle] = useState("");
  const [introTextEn, setIntroTextEn] = useState("");
  const [introTextEs, setIntroTextEs] = useState("");

  // Stable originals captured at load time
  const originalsRef = useRef({ intro_text_en: "", intro_text_es: "" });
  const { interceptSave, dialogProps } = useAutoTranslate({
    originalValues: originalsRef.current,
    errorMessage: t("admin.translate.error"),
  });

  const loadTopic = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const topic = await getTopicById(themeId);
      setTopicTitle(topic.title_en);
      const en = topic.intro_text_en ?? "";
      const es = topic.intro_text_es ?? "";
      setIntroTextEn(en);
      setIntroTextEs(es);
      originalsRef.current = { intro_text_en: en, intro_text_es: es };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load topic");
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  useEffect(() => {
    if (open) loadTopic();
  }, [open, loadTopic]);

  const handleSave = async () => {
    const current = {
      intro_text_en: introTextEn.trim() || null,
      intro_text_es: introTextEs.trim() || null,
    };

    interceptSave(current, async (final) => {
      setSaving(true);
      setError(null);
      try {
        await updateTopicIntroText(
          themeId,
          (final.intro_text_en as string) || null,
          (final.intro_text_es as string) || null,
        );
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
          <DialogTitle>{t("admin.editReading")}</DialogTitle>
          {topicTitle && (
            <p className="text-xs text-muted-foreground">{topicTitle}</p>
          )}
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">{t("common.loading")}</p>
        ) : error ? (
          <p className="text-sm text-red-500 py-4">{error}</p>
        ) : (
          <div className="space-y-4">
            {/* EN/ES tabs */}
            <div className="flex gap-2">
              <Button
                variant={editTab === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setEditTab("en")}
              >
                EN
              </Button>
              <Button
                variant={editTab === "es" ? "default" : "outline"}
                size="sm"
                onClick={() => setEditTab("es")}
              >
                ES
              </Button>
            </div>

            {/* Intro text */}
            <div className="space-y-2">
              <Label>Intro Text ({editTab.toUpperCase()}) — Markdown</Label>
              <Textarea
                value={editTab === "en" ? introTextEn : introTextEs}
                onChange={(e) =>
                  editTab === "en"
                    ? setIntroTextEn(e.target.value)
                    : setIntroTextEs(e.target.value)
                }
                rows={16}
                placeholder="Markdown supported"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? t("common.loading") : t("common.save")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {t("admin.cancelEdit")}
              </Button>
            </div>
          </div>
        )}

        <TranslateDialog {...dialogProps} />
      </DialogContent>
    </Dialog>
  );
}
