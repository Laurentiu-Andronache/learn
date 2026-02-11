"use client";

import { Brain } from "lucide-react";
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
import type { FsrsSettings } from "@/lib/services/user-preferences";
import { updateFsrsSettings } from "@/lib/services/user-preferences";

const DEFAULTS: FsrsSettings = {
  desired_retention: 0.9,
  max_review_interval: 36500,
  new_cards_per_day: 10,
  new_cards_ramp_up: true,
  show_review_time: true,
};

interface FsrsSettingsCardProps {
  userId: string;
  settings: FsrsSettings;
}

export function FsrsSettingsCard({ userId, settings }: FsrsSettingsCardProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [retention, setRetention] = useState(settings.desired_retention);
  const [maxInterval, setMaxInterval] = useState(settings.max_review_interval);
  const [newCards, setNewCards] = useState(settings.new_cards_per_day);
  const [rampUp, setRampUp] = useState(settings.new_cards_ramp_up);
  const [showIntervals, setShowIntervals] = useState(settings.show_review_time);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateFsrsSettings(userId, {
        desired_retention: retention,
        max_review_interval: maxInterval,
        new_cards_per_day: newCards,
        new_cards_ramp_up: rampUp,
        show_review_time: showIntervals,
      });
      toast.success(t("saved"));
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(false);
    }
  }, [userId, retention, maxInterval, newCards, rampUp, showIntervals, t, tc]);

  const handleReset = useCallback(() => {
    setRetention(DEFAULTS.desired_retention);
    setMaxInterval(DEFAULTS.max_review_interval);
    setNewCards(DEFAULTS.new_cards_per_day);
    setRampUp(DEFAULTS.new_cards_ramp_up);
    setShowIntervals(DEFAULTS.show_review_time);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain size={18} />
          {t("studySettings")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
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

        {/* Actions */}
        <div className="flex gap-2 justify-end">
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
