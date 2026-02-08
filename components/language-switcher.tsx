"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

const languages = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "es", label: "Español", flag: "🇪🇸" },
] as const;

function setLocaleCookie(locale: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: simple locale cookie, no framework alternative needed
  document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

const LanguageSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newLocale: string) => {
    setLocaleCookie(newLocale);

    // Persist to profile for authenticated users (fire-and-forget)
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.is_anonymous) {
        supabase
          .from("profiles")
          .update({
            preferred_language: newLocale,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .then(() => {});
      }
    });

    startTransition(() => {
      router.refresh();
    });
  };

  const current = languages.find((l) => l.value === locale) ?? languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending}>
          <Languages size={16} className="text-muted-foreground" />
          <span className="ml-1 text-xs text-muted-foreground">
            {current.value.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-content" align="start">
        <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
          {languages.map((lang) => (
            <DropdownMenuRadioItem
              key={lang.value}
              className="flex gap-2"
              value={lang.value}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { LanguageSwitcher };
