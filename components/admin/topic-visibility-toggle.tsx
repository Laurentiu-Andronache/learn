"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleTopicVisibility } from "@/lib/services/admin-topics";

export function TopicVisibilityToggle({
  topicId,
  isPrivate,
}: {
  topicId: string;
  isPrivate: boolean;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {isPrivate ? t("private") : t("public")}
      </span>
      <Switch
        checked={!isPrivate}
        disabled={isPending}
        onCheckedChange={(checked) => {
          startTransition(async () => {
            await toggleTopicVisibility(
              topicId,
              checked ? "public" : "private",
            );
            router.refresh();
          });
        }}
      />
    </div>
  );
}
