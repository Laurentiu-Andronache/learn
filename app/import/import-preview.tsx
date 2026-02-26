"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreviewData } from "./use-import-state";

interface ImportPreviewProps {
  preview: PreviewData;
  onReset: () => void;
  onConfirm: () => void;
}

export function ImportPreview({
  preview,
  onReset,
  onConfirm,
}: ImportPreviewProps) {
  const t = useTranslations("import");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("preview")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("deckName")}</span>
            <span className="font-medium">{preview.deckName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("cardCount", { count: preview.cardCount })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("mediaCount", { count: preview.mediaCount })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("categoryCount", { count: preview.categoryCount })}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onReset} className="flex-1">
          {t("importAnother")}
        </Button>
        <Button onClick={onConfirm} className="flex-1">
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}
