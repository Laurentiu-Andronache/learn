"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface FlashcardEditFormData {
  id: string;
  question_en: string;
  question_es: string | null;
  answer_en: string;
  answer_es: string | null;
  extra_en: string | null;
  extra_es: string | null;
  difficulty: number;
}

interface FlashcardEditFormProps {
  flashcard: FlashcardEditFormData;
  onSave: (updates: Record<string, unknown>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving?: boolean;
}

export function FlashcardEditForm({
  flashcard,
  onSave,
  onCancel,
  onDelete,
  saving,
}: FlashcardEditFormProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");

  const [editTab, setEditTab] = useState<"en" | "es">("en");
  const [editData, setEditData] = useState<Record<string, unknown>>({
    question_en: flashcard.question_en,
    question_es: flashcard.question_es ?? "",
    answer_en: flashcard.answer_en,
    answer_es: flashcard.answer_es ?? "",
    extra_en: flashcard.extra_en ?? "",
    extra_es: flashcard.extra_es ?? "",
    difficulty: flashcard.difficulty,
  });

  const handleSave = () => {
    const updates: Record<string, unknown> = { ...editData };
    for (const key of ["question_es", "answer_es", "extra_en", "extra_es"]) {
      if (updates[key] === "") updates[key] = null;
    }
    onSave(updates);
  };

  return (
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

      {/* Question text */}
      <div className="space-y-2">
        <Label>{editTab === "en" ? "Question (EN)" : "Question (ES)"}</Label>
        <Textarea
          className="[field-sizing:content]"
          value={(editData[`question_${editTab}`] as string) ?? ""}
          onChange={(e) =>
            setEditData({
              ...editData,
              [`question_${editTab}`]: e.target.value,
            })
          }
          rows={1}
        />
      </div>

      {/* Answer text */}
      <div className="space-y-2">
        <Label>{editTab === "en" ? "Answer (EN)" : "Answer (ES)"}</Label>
        <Textarea
          className="[field-sizing:content]"
          value={(editData[`answer_${editTab}`] as string) ?? ""}
          onChange={(e) =>
            setEditData({ ...editData, [`answer_${editTab}`]: e.target.value })
          }
          rows={1}
        />
      </div>

      {/* Extra */}
      <div className="space-y-2">
        <Label>Extra / Learn More ({editTab.toUpperCase()})</Label>
        <Textarea
          className="[field-sizing:content]"
          value={(editData[`extra_${editTab}`] as string) ?? ""}
          onChange={(e) =>
            setEditData({ ...editData, [`extra_${editTab}`]: e.target.value })
          }
          rows={3}
        />
      </div>

      {/* Difficulty */}
      <div className="space-y-2 max-w-xs">
        <Label>Difficulty (1-10)</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={editData.difficulty as number}
          onChange={(e) =>
            setEditData({
              ...editData,
              difficulty: parseInt(e.target.value, 10) || 1,
            })
          }
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? tc("loading") : t("saveFlashcard")}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("cancelEdit")}
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive ml-auto"
            onClick={onDelete}
          >
            {t("delete")}
          </Button>
        )}
      </div>
    </div>
  );
}
