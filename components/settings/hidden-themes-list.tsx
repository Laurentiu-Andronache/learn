"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { unhideTheme } from "@/lib/services/user-preferences";
import { Loader2, Eye } from "lucide-react";

interface HiddenThemesListProps {
  userId: string;
  items: Array<{
    id: string;
    hidden_at: string;
    theme: {
      id: string;
      title_en: string;
      title_es: string;
      icon: string | null;
      color: string | null;
    } | null;
  }>;
}

export function HiddenThemesList({ userId, items: initial }: HiddenThemesListProps) {
  const t = useTranslations("settings");
  const tThemes = useTranslations("themes");
  const locale = useLocale();
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleUnhide = (themeId: string) => {
    setPending(themeId);
    startTransition(async () => {
      await unhideTheme(userId, themeId);
      setItems((prev) => prev.filter((i) => i.theme?.id !== themeId));
      setPending(null);
    });
  };

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noHidden")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        if (!item.theme) return null;
        const theme = item.theme;
        const title = locale === "es" ? theme.title_es : theme.title_en;

        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              {theme.icon && <span className="text-lg">{theme.icon}</span>}
              <span className="text-sm truncate">{title}</span>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleUnhide(theme.id)}
              disabled={pending === theme.id}
            >
              {pending === theme.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  <Eye size={12} />
                  <span>{tThemes("unhide")}</span>
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
