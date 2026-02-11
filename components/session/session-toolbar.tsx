"use client";

import {
  ArrowDownToLine,
  CircleHelp,
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
  topicId: string;
  mode: "quiz" | "flashcard";
  isAdmin: boolean;
  currentQuestion?: QuestionEditFormData & { category_id?: string | null };
  currentFlashcard?: FlashcardEditFormData;
  onBury: () => void;
  onUndo: () => void;
  onDeleteQuestion: () => void;
  canUndo: boolean;
  onStop?: () => Promise<void> | void;
}

export function SessionToolbar({
  userId,
  topicId,
  mode,
  isAdmin,
  currentQuestion,
  currentFlashcard,
  onBury,
  onUndo,
  onDeleteQuestion,
  canUndo,
  onStop,
}: SessionToolbarProps) {
  const router = useRouter();
  const t = useTranslations("session");
  const [editOpen, setEditOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [findingNext, setFindingNext] = useState(false);
  const [stopping, setStopping] = useState(false);

  const currentItemId =
    mode === "flashcard" ? currentFlashcard?.id : currentQuestion?.id;

  const handleStop = async () => {
    if (stopping) return;
    setStopping(true);
    try {
      await onStop?.();
    } finally {
      router.push(`/topics/${topicId}`);
    }
  };

  const handleNextTopic = async () => {
    setFindingNext(true);
    try {
      const nextId = await findNextTopic(userId, topicId);
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

  const glowColor = mode === "flashcard"
    ? "shadow-[0_0_10px_-3px_hsl(var(--flashcard-accent)/0.3)]"
    : "shadow-[0_0_10px_-3px_hsl(var(--quiz-accent)/0.3)]";

  return (
    <>
      <div className={`mx-auto w-fit flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-lg border border-border/50 ${glowColor} px-2 py-1`}>
        <TooltipProvider>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHelpOpen(true)}
            className="rounded-full px-2"
          >
            <CircleHelp className="size-4" />
            <span className="sr-only">{t("help")}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleStop}
            disabled={stopping}
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

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("helpTitle")}</DialogTitle>
            <DialogDescription className="sr-only">
              Toolbar button descriptions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Square className="size-4 shrink-0" />
              <span>{t("helpStop")}</span>
            </div>
            <div className="flex items-center gap-3">
              <SkipForward className="size-4 shrink-0" />
              <span>{t("helpNextTopic")}</span>
            </div>
            {mode !== "quiz" && (
              <>
                <div className="flex items-center gap-3">
                  <ArrowDownToLine className="size-4 shrink-0" />
                  <span>{t("helpBury")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Undo2 className="size-4 shrink-0" />
                  <span>{t("helpUndo")}</span>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
