"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AnonymousLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      router.push("/themes");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
        {isLoading ? "Starting..." : "Try Without Account"}
      </Button>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
