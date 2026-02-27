"use client";

import { Brain } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { FsrsSettings } from "@/lib/services/user-preferences";
import { OptimizerSection } from "./optimizer-section";
import { useFsrsSettingsForm } from "./use-fsrs-settings-form";

interface FsrsSettingsCardProps {
  settings: FsrsSettings;
  reviewCount: number;
}

export function FsrsSettingsCard({
  settings,
  reviewCount,
}: FsrsSettingsCardProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const {
    formState,
    setFormState,
    saving,
    optimizing,
    weightsUpdatedAt,
    canOptimize,
    handleSave,
    handleReset,
    handleOptimize,
    handleResetWeights,
  } = useFsrsSettingsForm(settings, reviewCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain size={18} />
          {t("studySettings")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Parameter Optimization */}
        <OptimizerSection
          weightsUpdatedAt={weightsUpdatedAt}
          canOptimize={canOptimize}
          optimizing={optimizing}
          reviewCount={reviewCount}
          onOptimize={handleOptimize}
          onResetWeights={handleResetWeights}
        />

        <Separator />

        {/* Desired Retention */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="retention">{t("desiredRetention")}</Label>
            <span className="text-sm font-mono tabular-nums font-medium">
              {(formState.retention * 100).toFixed(0)}%
            </span>
          </div>
          <input
            id="retention"
            type="range"
            min={0.7}
            max={0.97}
            step={0.01}
            value={formState.retention}
            onChange={(e) =>
              setFormState((s) => ({ ...s, retention: Number(e.target.value) }))
            }
            className="w-full accent-primary"
          />
          <p className="text-xs text-muted-foreground">
            {t("retentionDescription")}
          </p>
        </div>

        <Separator />

        {/* Max Review Interval */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxInterval">{t("maxInterval")}</Label>
          <Input
            id="maxInterval"
            type="number"
            min={1}
            max={36500}
            value={formState.maxInterval}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= 36500)
                setFormState((s) => ({ ...s, maxInterval: v }));
            }}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            {t("maxIntervalDescription")}
          </p>
        </div>

        <Separator />

        {/* Gradual Introduction Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Label htmlFor="rampUp">{t("rampUp")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("rampUpDescription")}
            </p>
          </div>
          <Switch
            id="rampUp"
            checked={formState.rampUp}
            onCheckedChange={(v) => setFormState((s) => ({ ...s, rampUp: v }))}
          />
        </div>

        {/* New Cards Per Day */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="newCards">
            {formState.rampUp ? t("newCardsAfterRampUp") : t("newCardsPerDay")}
          </Label>
          <Input
            id="newCards"
            type="number"
            min={1}
            max={999}
            value={formState.newCardsPerDay}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= 999)
                setFormState((s) => ({ ...s, newCardsPerDay: v }));
            }}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            {t("newCardsPerDayDescription")}
          </p>
        </div>

        <Separator />

        {/* Show Interval Previews */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Label htmlFor="showIntervals">{t("showIntervals")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("showIntervalsDescription")}
            </p>
          </div>
          <Switch
            id="showIntervals"
            checked={formState.showIntervals}
            onCheckedChange={(v) =>
              setFormState((s) => ({ ...s, showIntervals: v }))
            }
          />
        </div>

        <Separator />

        {/* Read Questions Aloud */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Label htmlFor="readAloud">{t("readAloud")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("readAloudDescription")}
            </p>
          </div>
          <Switch
            id="readAloud"
            checked={formState.readQuestionsAloud}
            onCheckedChange={(v) =>
              setFormState((s) => ({ ...s, readQuestionsAloud: v }))
            }
          />
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2 justify-end flex-wrap">
          <Button variant="outline" size="sm" onClick={handleReset}>
            {t("resetDefaults")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? tc("loading") : tc("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
