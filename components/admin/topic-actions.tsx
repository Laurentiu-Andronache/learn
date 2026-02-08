"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { restoreTopic, softDeleteTopic } from "@/lib/services/admin-topics";

export function AdminTopicActions({
  topicId,
  isActive,
}: {
  topicId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const t = useTranslations();

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isActive) {
        await softDeleteTopic(topicId);
      } else {
        await restoreTopic(topicId);
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
      {loading ? "..." : isActive ? t("admin.deactivate") : t("admin.restore")}
    </Button>
  );
}
