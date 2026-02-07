"use client";

import { Button } from "@/components/ui/button";
import { softDeleteTheme, restoreTheme } from "@/lib/services/admin-themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminThemeActions({
  themeId,
  isActive,
}: {
  themeId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isActive) {
        await softDeleteTheme(themeId);
      } else {
        await restoreTheme(themeId);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isActive ? "destructive" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "..." : isActive ? "Deactivate" : "Restore"}
    </Button>
  );
}
