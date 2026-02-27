"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  FSRS_DEFAULT_MAX_INTERVAL,
  FSRS_DEFAULT_NEW_CARDS_PER_DAY,
  FSRS_DEFAULT_RETENTION,
  MIN_REVIEWS_FOR_OPTIMIZATION,
} from "@/lib/constants";
import {
  optimizeFsrsParameters,
  resetFsrsWeights,
} from "@/lib/fsrs/auto-optimizer";
import type { FsrsSettings } from "@/lib/services/user-preferences";
import { updateFsrsSettings } from "@/lib/services/user-preferences";

interface FormState {
  retention: number;
  maxInterval: number;
  newCardsPerDay: number;
  rampUp: boolean;
  showIntervals: boolean;
  readQuestionsAloud: boolean;
}

const DEFAULTS: FormState = {
  retention: FSRS_DEFAULT_RETENTION,
  maxInterval: FSRS_DEFAULT_MAX_INTERVAL,
  newCardsPerDay: FSRS_DEFAULT_NEW_CARDS_PER_DAY,
  rampUp: true,
  showIntervals: true,
  readQuestionsAloud: false,
};

export function useFsrsSettingsForm(
  settings: FsrsSettings,
  reviewCount: number,
) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [formState, setFormState] = useState<FormState>({
    retention: settings.desired_retention,
    maxInterval: settings.max_review_interval,
    newCardsPerDay: settings.new_cards_per_day,
    rampUp: settings.new_cards_ramp_up,
    showIntervals: settings.show_review_time,
    readQuestionsAloud: settings.read_questions_aloud,
  });
  const [saving, setSaving] = useState(false);
  const [weightsUpdatedAt, setWeightsUpdatedAt] = useState(
    settings.fsrs_weights_updated_at,
  );
  const [optimizing, setOptimizing] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateFsrsSettings({
        desired_retention: formState.retention,
        max_review_interval: formState.maxInterval,
        new_cards_per_day: formState.newCardsPerDay,
        new_cards_ramp_up: formState.rampUp,
        show_review_time: formState.showIntervals,
        read_questions_aloud: formState.readQuestionsAloud,
      });
      toast.success(t("saved"));
    } catch {
      toast.error(tc("error"));
    } finally {
      setSaving(false);
    }
  }, [formState, t, tc]);

  const handleReset = useCallback(() => {
    setFormState(DEFAULTS);
  }, []);

  const handleOptimize = useCallback(async () => {
    setOptimizing(true);
    try {
      const result = await optimizeFsrsParameters();
      if (result.success) {
        setWeightsUpdatedAt(new Date().toISOString());
        toast.success(t("optimizer.optimized"));
      } else if (result.error === "not_enough_reviews") {
        toast.error(
          t("optimizer.needMoreReviews", {
            count: reviewCount,
            threshold: MIN_REVIEWS_FOR_OPTIMIZATION,
          }),
        );
      } else {
        toast.error(tc("error"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setOptimizing(false);
    }
  }, [reviewCount, t, tc]);

  const handleResetWeights = useCallback(async () => {
    try {
      await resetFsrsWeights();
      setWeightsUpdatedAt(null);
      toast.success(t("optimizer.resetDone"));
    } catch {
      toast.error(tc("error"));
    }
  }, [t, tc]);

  const canOptimize = reviewCount >= MIN_REVIEWS_FOR_OPTIMIZATION;

  return {
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
  };
}
