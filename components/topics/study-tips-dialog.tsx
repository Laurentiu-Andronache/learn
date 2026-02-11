"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "learn_tips_seen";

export function StudyTipsDialog() {
  const t = useTranslations("topics.tips");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Study Tips</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="mr-1.5">&#128161;</span>
            {t("readFirst")}
          </p>
          <p>
            <span className="mr-1.5">&#129504;</span>
            {t("speakAnswer")}
          </p>
          <p>
            <span className="mr-1.5">&#128264;</span>
            {t("listenAloud")}
          </p>
        </div>
        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleClose}>
            {tc("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
