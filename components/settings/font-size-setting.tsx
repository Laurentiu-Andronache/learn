"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Slider } from "@/components/ui/slider";
import { updateBaseFontSize } from "@/lib/services/user-preferences";

interface FontSizeSettingProps {
  userId: string;
  initialSize: number;
}

export function FontSizeSetting({ userId, initialSize }: FontSizeSettingProps) {
  const t = useTranslations("settings");
  const [size, setSize] = useState(initialSize);
  const [, startTransition] = useTransition();

  // On mount: apply CSS variable + ensure cookie is set (handles cross-device DB→cookie sync)
  useEffect(() => {
    applySize(initialSize);
    if (initialSize !== 14) {
      document.cookie = `base_font_size=${initialSize};path=/;max-age=31536000;SameSite=Lax`;
    }
  }, [initialSize]);

  function applySize(value: number) {
    document.documentElement.style.setProperty("--text-sm", `${value / 16}rem`);
  }

  function handleChange(values: number[]) {
    const value = values[0];
    setSize(value);
    applySize(value);
  }

  function handleCommit(values: number[]) {
    const value = values[0];
    document.cookie = `base_font_size=${value};path=/;max-age=31536000;SameSite=Lax`;
    startTransition(async () => {
      try {
        await updateBaseFontSize(userId, value);
      } catch {
        // Silently fail — cookie already persists locally
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("fontSize")}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {t("fontSizePx", { size })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("fontSizeDescription")}
      </p>
      <Slider
        min={12}
        max={18}
        step={1}
        value={[size]}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
      />
    </div>
  );
}
