"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReviewItem {
  id: string;
  status: string;
  admin_notes?: string | null;
  created_at: string;
}

interface ReviewQueueProps<T extends ReviewItem> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  onUpdateStatus: (id: string, status: string, notes?: string) => Promise<void>;
  statusOptions: {
    value: string;
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  }[];
}

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  reviewing: "default",
  resolved: "outline",
  dismissed: "destructive",
  approved: "outline",
  rejected: "destructive",
};

export function ReviewQueue<T extends ReviewItem>({
  items,
  renderItem,
  onUpdateStatus,
  statusOptions,
}: ReviewQueueProps<T>) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const t = useTranslations();

  const handleAction = async (id: string, status: string) => {
    setLoading(id);
    try {
      await onUpdateStatus(id, status, editingId === id ? notes : undefined);
      setEditingId(null);
      setNotes("");
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

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
        <div key={item.id} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">{renderItem(item)}</div>
            <Badge variant={statusColors[item.status] ?? "secondary"}>
              {item.status}
            </Badge>
          </div>

          {item.admin_notes && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Admin: {item.admin_notes}
            </p>
          )}

          <div className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleDateString()}
          </div>

          {editingId === item.id && (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("admin.adminNotes")}
              rows={2}
              className="text-sm"
            />
          )}

          <div className="flex gap-2 flex-wrap">
            {statusOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={opt.variant ?? "outline"}
                size="sm"
                onClick={() => handleAction(item.id, opt.value)}
                disabled={loading === item.id || item.status === opt.value}
              >
                {opt.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingId(editingId === item.id ? null : item.id);
                setNotes(item.admin_notes ?? "");
              }}
            >
              {editingId === item.id
                ? t("admin.hideNotes")
                : t("admin.addNotes")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
