"use client";

import { useTranslations } from "next-intl";
import {
  FlashcardEditForm,
  type FlashcardEditFormData,
} from "@/components/admin/flashcard-edit-form";
import {
  QuestionEditForm,
  type QuestionEditFormData,
} from "@/components/admin/question-edit-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "flashcard" | "quiz";
  currentFlashcard?: FlashcardEditFormData;
  currentQuestion?: QuestionEditFormData & { category_id?: string | null };
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}

export function EditDialog({
  open,
  onOpenChange,
  mode,
  currentFlashcard,
  currentQuestion,
  onSave,
  saving,
}: EditDialogProps) {
  const t = useTranslations("session");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit")}</DialogTitle>
          <DialogDescription className="sr-only">
            Edit form
          </DialogDescription>
        </DialogHeader>
        {mode === "flashcard" && currentFlashcard ? (
          <FlashcardEditForm
            flashcard={currentFlashcard}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
            saving={saving}
          />
        ) : currentQuestion ? (
          <QuestionEditForm
            question={currentQuestion}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
            saving={saving}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
