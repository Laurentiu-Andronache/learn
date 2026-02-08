"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AnonymousLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations();

  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      router.refresh();
      router.push("/topics");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        className="w-full"
        onClick={handleAnonymousLogin}
        disabled={isLoading}
      >
        {isLoading ? t("auth.starting") : t("auth.anonymous")}
      </Button>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
