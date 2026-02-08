"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
import type { TranslateDialogProps } from "@/hooks/use-auto-translate";

const langNames = { en: "English", es: "Spanish" } as const;

export function TranslateDialog({
  open,
  targetLang,
  translating,
  onConfirm,
  onDecline,
}: TranslateDialogProps) {
  const t = useTranslations("admin.translate");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => !v && !translating && onDecline()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", {
              targetLang: targetLang ? langNames[targetLang] : "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDecline} disabled={translating}>
            {t("decline")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={translating}>
            {translating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("translating")}
              </>
            ) : (
              t("confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
