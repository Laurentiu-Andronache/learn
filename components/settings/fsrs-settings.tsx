"use client";

import { Brain, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  optimizeFsrsParameters,
  resetFsrsWeights,
} from "@/lib/fsrs/actions";
import type { FsrsSettings } from "@/lib/services/user-preferences";
import { updateFsrsSettings } from "@/lib/services/user-preferences";

const DEFAULTS: Omit<FsrsSettings, "fsrs_weights" | "fsrs_weights_updated_at"> = {
  desired_retention: 0.9,
  max_review_interval: 36500,
  new_cards_per_day: 10,
  new_cards_ramp_up: true,
  show_review_time: true,
  read_questions_aloud: false,
};

interface FsrsSettingsCardProps {
  userId: string;
  settings: FsrsSettings;
  reviewCount: number;
}

export function FsrsSettingsCard({ userId, settings, reviewCount }: FsrsSettingsCardProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [retention, setRetention] = useState(settings.desired_retention);
  const [maxInterval, setMaxInterval] = useState(settings.max_review_interval);
  const [newCards, setNewCards] = useState(settings.new_cards_per_day);
  const [rampUp, setRampUp] = useState(settings.new_cards_ramp_up);
  const [showIntervals, setShowIntervals] = useState(settings.show_review_time);
  const [readAloud, setReadAloud] = useState(settings.read_questions_aloud);
  const [saving, setSaving] = useState(false);

  const [weightsUpdatedAt, setWeightsUpdatedAt] = useState(settings.fsrs_weights_updated_at);
  const [optimizing, setOptimizing] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateFsrsSettings(userId, {
        desired_retention: retention,
        max_review_interval: maxInterval,
        new_cards_per_day: newCards,
        new_cards_ramp_up: rampUp,
        show_review_time: showIntervals,
        read_questions_aloud: readAloud,
      });
      toast.success(t("saved"));
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(false);
    }
  }, [userId, retention, maxInterval, newCards, rampUp, showIntervals, readAloud, t, tc]);

  const handleReset = useCallback(() => {
    setRetention(DEFAULTS.desired_retention);
    setMaxInterval(DEFAULTS.max_review_interval);
    setNewCards(DEFAULTS.new_cards_per_day);
    setRampUp(DEFAULTS.new_cards_ramp_up);
    setShowIntervals(DEFAULTS.show_review_time);
    setReadAloud(DEFAULTS.read_questions_aloud);
  }, []);

  const handleOptimize = useCallback(async () => {
    setOptimizing(true);
    try {
      const result = await optimizeFsrsParameters(userId);
      if (result.success) {
        setWeightsUpdatedAt(new Date().toISOString());
        toast.success(t("optimizer.optimized"));
      } else if (result.error === "not_enough_reviews") {
        toast.error(t("optimizer.needMoreReviews", { count: reviewCount, threshold: 50 }));
      } else {
        toast.error(tc("error"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setOptimizing(false);
    }
  }, [userId, reviewCount, t, tc]);

  const handleResetWeights = useCallback(async () => {
    try {
      await resetFsrsWeights(userId);
      setWeightsUpdatedAt(null);
      toast.success(t("optimizer.resetDone"));
    } catch {
      toast.error(tc("error"));
    }
  }, [userId, t, tc]);

  const canOptimize = reviewCount >= 50;

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
              onClick={handleOptimize}
              disabled={!canOptimize || optimizing}
            >
              {optimizing ? tc("loading") : t("optimizer.optimizeNow")}
            </Button>
            {weightsUpdatedAt && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetWeights}
                className="text-muted-foreground"
              >
                {t("optimizer.resetWeights")}
              </Button>
            )}
          </div>
          {!canOptimize && (
            <p className="text-xs text-muted-foreground">
              {t("optimizer.needMoreReviews", { count: reviewCount, threshold: 50 })}
            </p>
          )}
        </div>

        <Separator />

        {/* Desired Retention */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="retention">{t("desiredRetention")}</Label>
            <span className="text-sm font-mono tabular-nums font-medium">
              {(retention * 100).toFixed(0)}%
            </span>
          </div>
          <input
            id="retention"
            type="range"
            min={0.7}
            max={0.97}
            step={0.01}
            value={retention}
            onChange={(e) => setRetention(Number(e.target.value))}
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
            value={maxInterval}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= 36500) setMaxInterval(v);
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
            checked={rampUp}
            onCheckedChange={setRampUp}
          />
        </div>

        {/* New Cards Per Day */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="newCards">
            {rampUp ? t("newCardsAfterRampUp") : t("newCardsPerDay")}
          </Label>
          <Input
            id="newCards"
            type="number"
            min={1}
            max={999}
            value={newCards}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= 999) setNewCards(v);
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
            checked={showIntervals}
            onCheckedChange={setShowIntervals}
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
            checked={readAloud}
            onCheckedChange={setReadAloud}
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
