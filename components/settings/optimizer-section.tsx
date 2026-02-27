"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MIN_REVIEWS_FOR_OPTIMIZATION } from "@/lib/constants";

interface OptimizerSectionProps {
  weightsUpdatedAt: string | null;
  canOptimize: boolean;
  optimizing: boolean;
  reviewCount: number;
  onOptimize: () => void;
  onResetWeights: () => void;
}

export function OptimizerSection({
  weightsUpdatedAt,
  canOptimize,
  optimizing,
  reviewCount,
  onOptimize,
  onResetWeights,
}: OptimizerSectionProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-primary" />
        <Label>{t("optimizer.title")}</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("optimizer.description")}
      </p>
      <div className="flex items-center gap-3 mt-1">
        {weightsUpdatedAt ? (
          <p className="text-xs text-muted-foreground">
            {t("optimizer.optimizedOn", {
              date: new Date(weightsUpdatedAt).toLocaleDateString(),
            })}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("optimizer.usingDefaults")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onOptimize}
          disabled={!canOptimize || optimizing}
        >
          {optimizing ? tc("loading") : t("optimizer.optimizeNow")}
        </Button>
        {weightsUpdatedAt && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetWeights}
            className="text-muted-foreground"
          >
            {t("optimizer.resetWeights")}
          </Button>
        )}
      </div>
      {!canOptimize && (
        <p className="text-xs text-muted-foreground">
          {t("optimizer.needMoreReviews", {
            count: reviewCount,
            threshold: MIN_REVIEWS_FOR_OPTIMIZATION,
          })}
        </p>
      )}
    </div>
  );
}
