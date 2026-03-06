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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  hardDeleteTopic,
  restoreTopic,
  softDeleteTopic,
} from "@/lib/services/admin-topics";

export function AdminTopicActions({
  topicId,
  isActive,
  topicTitle,
}: {
  topicId: string;
  isActive: boolean;
  topicTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations();

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isActive) {
        await softDeleteTopic(topicId);
      } else {
        await restoreTopic(topicId);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await hardDeleteTopic(topicId);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete topic",
      );
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isActive ? "destructive" : "default"}
        size="sm"
        onClick={handleToggle}
        disabled={loading || deleting}
      >
        {loading
          ? "..."
          : isActive
            ? t("admin.deactivate")
            : t("admin.restore")}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading || deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete topic permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{topicTitle}</strong> and all
              its categories, flashcards, questions, user progress, and media
              files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
