"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resetAllProgress, resetTodayProgress } from "@/lib/fsrs/actions";
import type { TopicProgress } from "@/lib/fsrs/progress";
import {
  hideTopic,
  unsuspendAllFlashcardsForTopic,
} from "@/lib/services/user-preferences";
import { topicUrl } from "@/lib/topics/topic-url";

interface TopicData {
  id: string;
  slug: string | null;
  title_en: string;
  title_es: string | null;
  description_en: string | null;
  description_es: string | null;
  icon: string | null;
  creator: { display_name: string | null } | null;
  visibility?: string | null;
  creator_id?: string | null;
}

interface TopicCardProps {
  topic: TopicData;
  progress: TopicProgress | null;
  userId: string;
  locale: string;
}

export function TopicCard({ topic, progress, userId, locale }: TopicCardProps) {
  const router = useRouter();
  const t = useTranslations("topics");
  const tc = useTranslations("common");
  const [confirmAction, setConfirmAction] = useState<
    "resetToday" | "resetAll" | null
  >(null);
  const menuInteracting = useRef(false);

  const title =
    locale === "es" ? topic.title_es || topic.title_en : topic.title_en;
  const description =
    locale === "es"
      ? topic.description_es || topic.description_en
      : topic.description_en;

  const total = progress?.total ?? 0;
  const newPct = total > 0 ? (progress!.newCount / total) * 100 : 100;
  const learningPct = total > 0 ? (progress!.learningCount / total) * 100 : 0;
  const reviewPct = total > 0 ? (progress!.reviewCount / total) * 100 : 0;
  const masteredPct = total > 0 ? (progress!.masteredCount / total) * 100 : 0;

  const handleHide = async () => {
    await hideTopic(userId, topic.id);
    router.refresh();
  };

  const handleShareLink = async () => {
    const url = `${window.location.origin}${topicUrl(topic)}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
  };

  const handleUnsuspendAll = async () => {
    const count = await unsuspendAllFlashcardsForTopic(userId, topic.id);
    if (count > 0) {
      toast.success(t("unsuspendAllSuccess", { count }));
      router.refresh();
    } else {
      toast.info(t("noSuspendedQuestions"));
    }
  };

  const handleResetToday = async () => {
    const count = await resetTodayProgress(userId, topic.id);
    if (count > 0) {
      toast.success(t("resetTodaySuccess", { count }));
      router.refresh();
    } else {
      toast.info(t("noReviewsToday"));
    }
    setConfirmAction(null);
  };

  const handleResetAll = async () => {
    const result = await resetAllProgress(userId, topic.id);
    const total = result.reviewLogs + result.cardStates + result.suspended;
    if (total > 0) {
      toast.success(t("resetAllSuccess"));
      router.refresh();
    } else {
      toast.info(t("noProgressToReset"));
    }
    setConfirmAction(null);
  };

  return (
    <div className="h-full">
      <Card
        className="hover:shadow-glow-sm hover:border-primary/20 transition-all duration-200 cursor-pointer h-full"
        onClick={() => {
          if (menuInteracting.current) return;
          router.push(topicUrl(topic));
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl bg-muted rounded-full p-2">
                {topic.icon}
              </span>
              <h3 className="font-semibold text-lg leading-tight">{title}</h3>
            </div>
            <DropdownMenu
              onOpenChange={(open) => {
                if (!open) {
                  menuInteracting.current = true;
                  setTimeout(() => {
                    menuInteracting.current = false;
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
                    menuInteracting.current = true;
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  &#x22EF;
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={handleShareLink}>
                  {t("shareLink")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUnsuspendAll}>
                  {t("unsuspendAll")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setConfirmAction("resetToday")}
                >
                  {t("resetToday")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleHide}>
                  {t("hide")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setConfirmAction("resetAll")}
                >
                  {t("resetAll")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("createdBy", {
              creator: topic.creator?.display_name || t("anonymous"),
            })}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>

          {/* Progress bar */}
          {total > 0 && (
            <div className="space-y-1">
              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                <div
                  className="bg-progress-mastered"
                  style={{ width: `${masteredPct}%` }}
                />
                <div
                  className="bg-progress-review"
                  style={{ width: `${reviewPct}%` }}
                />
                <div
                  className="bg-progress-learning"
                  style={{ width: `${learningPct}%` }}
                />
                <div
                  className="bg-progress-new"
                  style={{ width: `${newPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {total} {t("flashcardCount")}
                </span>
                <span>
                  {progress?.percentComplete ?? 0}% {t("recallMastery")}
                </span>
              </div>
            </div>
          )}

          {/* Due today badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {topic.visibility === "private" && (
              <Badge variant="outline" className="text-xs">
                {t("private")}
              </Badge>
            )}
            {progress && progress.dueToday > 0 && (
              <Badge variant="secondary">
                {progress.dueToday} {t("dueToday")}
              </Badge>
            )}
            {progress?.fullyMemorized && (
              <Badge className="bg-progress-mastered/15 text-progress-mastered border-progress-mastered/30 border">
                {t("fullyMemorized")}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialogs */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
            menuInteracting.current = true;
            setTimeout(() => {
              menuInteracting.current = false;
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
    </div>
  );
}
