"use client";

import {
  ArrowDownToLine,
  SkipForward,
  Square,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "flashcard" | "quiz";
}

export function HelpDialog({ open, onOpenChange, mode }: HelpDialogProps) {
  const t = useTranslations("session");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <div className="pt-2 border-t">
                <p className="font-medium mb-2">{t("helpShortcutsTitle")}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-2">
                    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border bg-muted text-xs font-mono">
                      1
                    </kbd>
                    <span>{t("helpShortcutAgain")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border bg-muted text-xs font-mono">
                      2
                    </kbd>
                    <span>{t("helpShortcutHard")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border bg-muted text-xs font-mono">
                      3
                    </kbd>
                    <span>/</span>
                    <kbd className="inline-flex items-center justify-center h-6 px-1.5 rounded border bg-muted text-xs font-mono">
                      Space
                    </kbd>
                    <span>{t("helpShortcutGood")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border bg-muted text-xs font-mono">
                      4
                    </kbd>
                    <span>{t("helpShortcutEasy")}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
