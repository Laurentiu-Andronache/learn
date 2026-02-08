"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteFeedback } from "@/lib/services/admin-reviews";

interface FeedbackItem {
  id: string;
  message: string;
  name: string | null;
  email: string | null;
  url: string | null;
  created_at: string;
}

export function FeedbackClient({ items }: { items: FeedbackItem[] }) {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t("admin.noItems")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                setLoading(item.id);
                try {
                  await deleteFeedback(item.id);
                  router.refresh();
                } finally {
                  setLoading(null);
                }
              }}
              disabled={loading === item.id}
            >
              {t("admin.delete")}
            </Button>
          </div>
          {item.name && (
            <p className="text-sm font-medium">{item.name}</p>
          )}
          {item.email && (
            <p className="text-xs text-muted-foreground">{item.email}</p>
          )}
          <p className="text-sm">{item.message}</p>
          {item.url && (
            <p className="text-xs text-muted-foreground truncate">
              Page: {item.url}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
