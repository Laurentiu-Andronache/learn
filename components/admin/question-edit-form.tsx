"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import type { QuestionUpdate } from "@/lib/types/database";

export interface QuestionEditFormData {
  id: string;
  question_en: string;
  question_es: string | null;
  options_en: string[] | null;
  options_es: string[] | null;
  correct_index: number | null;
  explanation_en: string | null;
  explanation_es: string | null;
  extra_en: string | null;
  extra_es: string | null;
  type: string;
  difficulty: number;
}

interface QuestionEditFormProps {
  question: QuestionEditFormData;
  onSave: (updates: QuestionUpdate) => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving?: boolean;
}

interface QuestionFormState {
  question_en: string;
  question_es: string;
  options_en: string[];
  options_es: string[];
  correct_index: number;
  explanation_en: string;
  explanation_es: string;
  extra_en: string;
  extra_es: string;
  difficulty: number;
  type: string;
}

/** Type-safe accessor for locale-switched fields. */
function localeField<K extends string>(
  state: QuestionFormState,
  base: K,
  lang: "en" | "es",
): K extends "options" ? string[] : string {
  const key = `${base}_${lang}` as keyof QuestionFormState;
  return state[key] as K extends "options" ? string[] : string;
}

export function QuestionEditForm({
  question,
  onSave,
  onCancel,
  onDelete,
  saving,
}: QuestionEditFormProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");

  const [editTab, setEditTab] = useState<"en" | "es">("en");
  const [editData, setEditData] = useState<QuestionFormState>({
    question_en: question.question_en,
    question_es: question.question_es ?? "",
    options_en: question.options_en ?? [],
    options_es: question.options_es ?? [],
    correct_index: question.correct_index ?? 0,
    explanation_en: question.explanation_en ?? "",
    explanation_es: question.explanation_es ?? "",
    extra_en: question.extra_en ?? "",
    extra_es: question.extra_es ?? "",
    difficulty: question.difficulty,
    type: question.type,
  });

  const updateOption = (lang: "en" | "es", index: number, value: string) => {
    const key = lang === "en" ? "options_en" : "options_es";
    const options = [...localeField(editData, "options", lang)];
    options[index] = value;
    setEditData({ ...editData, [key]: options });
  };

  const handleSave = () => {
    const updates: Record<string, unknown> = { ...editData };
    for (const key of [
      "question_es",
      "explanation_en",
      "explanation_es",
      "extra_en",
      "extra_es",
    ]) {
      if (updates[key] === "") updates[key] = null;
    }
    onSave(updates as QuestionUpdate);
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
          value={localeField(editData, "question", editTab)}
          onChange={(e) =>
            setEditData({
              ...editData,
              [`question_${editTab}`]: e.target.value,
            })
          }
          rows={1}
        />
      </div>

      {/* Options */}
      <div className="space-y-2">
        <Label>Options ({editTab.toUpperCase()})</Label>
        {localeField(editData, "options", editTab).map((opt, i) => (
          <div key={`${editTab}-${i}`} className="flex gap-2 items-center">
            <span className="text-xs font-mono w-5">
              {String.fromCharCode(65 + i)}
            </span>
            <Input
              value={opt}
              onChange={(e) => updateOption(editTab, i, e.target.value)}
            />
            {i === editData.correct_index && (
              <span className="text-green-600 text-sm font-bold shrink-0">
                ✓
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Correct index */}
      <div className="space-y-2">
        <Label>Correct Index</Label>
        <Input
          type="number"
          min={0}
          max={editData.options_en.length - 1}
          value={editData.correct_index}
          onChange={(e) =>
            setEditData({
              ...editData,
              correct_index: parseInt(e.target.value, 10) || 0,
            })
          }
          className="w-20"
        />
      </div>

      {/* Explanation */}
      <div className="space-y-2">
        <Label>Explanation ({editTab.toUpperCase()})</Label>
        <Textarea
          className="[field-sizing:content]"
          value={localeField(editData, "explanation", editTab)}
          onChange={(e) =>
            setEditData({
              ...editData,
              [`explanation_${editTab}`]: e.target.value,
            })
          }
          rows={1}
        />
      </div>

      {/* Extra */}
      <div className="space-y-2">
        <Label>Extra / Learn More ({editTab.toUpperCase()})</Label>
        <Textarea
          className="[field-sizing:content]"
          value={localeField(editData, "extra", editTab)}
          onChange={(e) =>
            setEditData({ ...editData, [`extra_${editTab}`]: e.target.value })
          }
          rows={3}
        />
      </div>

      {/* Shared fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Difficulty (1-10)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={editData.difficulty}
            onChange={(e) =>
              setEditData({
                ...editData,
                difficulty: parseInt(e.target.value, 10) || 1,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={editData.type}
            onValueChange={(v) => setEditData({ ...editData, type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">MC</SelectItem>
              <SelectItem value="true_false">T/F</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? tc("loading") : t("saveQuestion")}
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
