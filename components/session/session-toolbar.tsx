"use client";

import {
  ArrowDownToLine,
  Pencil,
  SkipForward,
  Square,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  FlashcardEditForm,
  type FlashcardEditFormData,
} from "@/components/admin/flashcard-edit-form";
import {
  QuestionEditForm,
  type QuestionEditFormData,
} from "@/components/admin/question-edit-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { findNextTopic } from "@/lib/fsrs/actions";
import {
  deleteFlashcard,
  deleteQuestion,
  updateFlashcard,
  updateQuestion,
} from "@/lib/services/admin-reviews";

interface SessionToolbarProps {
  userId: string;
  themeId: string;
  mode: "quiz" | "flashcard";
  isAdmin: boolean;
  currentQuestion?: QuestionEditFormData & { category_id?: string | null };
  currentFlashcard?: FlashcardEditFormData;
  onBury: () => void;
  onUndo: () => void;
  onDeleteQuestion: () => void;
  canUndo: boolean;
}

export function SessionToolbar({
  userId,
  themeId,
  mode,
  isAdmin,
  currentQuestion,
  currentFlashcard,
  onBury,
  onUndo,
  onDeleteQuestion,
  canUndo,
}: SessionToolbarProps) {
  const router = useRouter();
  const t = useTranslations("session");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [findingNext, setFindingNext] = useState(false);

  const currentItemId =
    mode === "flashcard" ? currentFlashcard?.id : currentQuestion?.id;

  const handleStop = () => {
    router.push("/topics");
  };

  const handleNextTopic = async () => {
    setFindingNext(true);
    try {
      const nextId = await findNextTopic(userId, themeId);
      if (nextId) {
        router.push(
          `/topics/${nextId}/${mode === "quiz" ? "quiz" : "flashcards"}`,
        );
      } else {
        toast.info(t("noMoreDueTopics"));
        router.push("/topics");
      }
    } finally {
      setFindingNext(false);
    }
  };

  const handleEditSave = async (updates: Record<string, unknown>) => {
    if (!currentItemId) return;
    setSaving(true);
    try {
      if (mode === "flashcard") {
        await updateFlashcard(currentItemId, updates);
      } else {
        await updateQuestion(currentItemId, updates);
      }
      toast.success(t("questionUpdated"));
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentItemId) return;
    if (!confirm(t("deleteConfirm"))) return;
    if (mode === "flashcard") {
      await deleteFlashcard(currentItemId);
    } else {
      await deleteQuestion(currentItemId);
    }
    toast.success(t("questionDeleted"));
    onDeleteQuestion();
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full bg-background/95 backdrop-blur-sm border shadow-lg px-2 py-1">
        <TooltipProvider>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStop}
            className="rounded-full px-2"
          >
            <Square className="size-4" />
            <span className="sr-only">{t("stop")}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextTopic}
            disabled={findingNext}
            className="rounded-full px-2"
          >
            <SkipForward className="size-4" />
            <span className="sr-only">
              {findingNext ? t("finding") : t("nextTopic")}
            </span>
          </Button>

          {mode !== "quiz" && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBury}
                    className="rounded-full px-2"
                  >
                    <ArrowDownToLine className="size-4" />
                    <span className="sr-only">{t("bury")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  {t("buryTooltip")}
                </TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
                className="rounded-full px-2"
              >
                <Undo2 className="size-4" />
                <span className="sr-only">{t("undo")}</span>
              </Button>
            </>
          )}

          {isAdmin && (
            <>
              <div className="w-px h-5 bg-border mx-0.5" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="rounded-full px-2"
              >
                <Pencil className="size-4" />
                <span className="sr-only">{t("edit")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteConfirm}
                className="rounded-full px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
                <span className="sr-only">{t("delete")}</span>
              </Button>
            </>
          )}
        </TooltipProvider>
      </div>

      {isAdmin && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
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
                onSave={handleEditSave}
                onCancel={() => setEditOpen(false)}
                saving={saving}
              />
            ) : currentQuestion ? (
              <QuestionEditForm
                question={currentQuestion}
                onSave={handleEditSave}
                onCancel={() => setEditOpen(false)}
                saving={saving}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
