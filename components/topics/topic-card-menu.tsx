"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resetAllProgress, resetTodayProgress } from "@/lib/fsrs/actions";
import {
  hideTopic,
  unsuspendAllFlashcardsForTopic,
} from "@/lib/services/user-preferences";
import { topicUrl } from "@/lib/topics/topic-url";

interface TopicCardMenuProps {
  topicId: string;
  topicSlug: string | null;
  onInteractionChange: (interacting: boolean) => void;
}

export function TopicCardMenu({
  topicId,
  topicSlug,
  onInteractionChange,
}: TopicCardMenuProps) {
  const router = useRouter();
  const t = useTranslations("topics");
  const tc = useTranslations("common");
  const [confirmAction, setConfirmAction] = useState<
    "resetToday" | "resetAll" | null
  >(null);

  const topic = { id: topicId, slug: topicSlug };

  const handleHide = async () => {
    try {
      await hideTopic(topicId);
      router.refresh();
    } catch {
      toast.error(t("actionFailed"));
    }
  };

  const handleShareLink = async () => {
    const url = `${window.location.origin}${topicUrl(topic)}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
  };

  const handleUnsuspendAll = async () => {
    try {
      const count = await unsuspendAllFlashcardsForTopic(topicId);
      if (count > 0) {
        toast.success(t("unsuspendAllSuccess", { count }));
        router.refresh();
      } else {
        toast.info(t("noSuspendedQuestions"));
      }
    } catch {
      toast.error(t("actionFailed"));
    }
  };

  const handleResetToday = async () => {
    try {
      const count = await resetTodayProgress(topicId);
      if (count > 0) {
        toast.success(t("resetTodaySuccess", { count }));
        router.refresh();
      } else {
        toast.info(t("noReviewsToday"));
      }
    } catch {
      toast.error(t("actionFailed"));
    }
    setConfirmAction(null);
  };

  const handleResetAll = async () => {
    try {
      const result = await resetAllProgress(topicId);
      const total = result.reviewLogs + result.cardStates + result.suspended;
      if (total > 0) {
        toast.success(t("resetAllSuccess"));
        router.refresh();
      } else {
        toast.info(t("noProgressToReset"));
      }
    } catch {
      toast.error(t("actionFailed"));
    }
    setConfirmAction(null);
  };

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) {
            onInteractionChange(true);
            setTimeout(() => {
              onInteractionChange(false);
            }, 0);
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onPointerDown={() => {
              onInteractionChange(true);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            &#x22EF;
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handleShareLink}>
            {t("shareLink")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleUnsuspendAll}>
            {t("unsuspendAll")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmAction("resetToday")}>
            {t("resetToday")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleHide}>{t("hide")}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setConfirmAction("resetAll")}
          >
            {t("resetAll")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
            onInteractionChange(true);
            setTimeout(() => {
              onInteractionChange(false);
            }, 0);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "resetToday"
                ? t("resetTodayTitle")
                : t("resetAllTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "resetToday"
                ? t("resetTodayConfirm")
                : t("resetAllConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmAction === "resetAll" ? "destructive" : "default"}
              onClick={
                confirmAction === "resetToday"
                  ? handleResetToday
                  : handleResetAll
              }
            >
              {tc("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
