"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Automatically signs the visitor in as an anonymous guest,
 * then refreshes the page so the server component re-renders
 * with a valid session. Used on shared topic links so
 * unauthenticated visitors land directly on the content.
 */
export function AutoGuestLogin() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [error, setError] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const supabase = createClient();
    supabase.auth.signInAnonymously().then(({ error }) => {
      if (error) {
        setError(true);
        return;
      }
      router.refresh();
    });
  }, [router]);

  if (error) {
    // Fallback: send to login page
    router.replace("/auth/login");
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">{t("starting")}</span>
    </div>
  );
}
