"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { QuestionEditDialog } from "@/components/admin/question-edit-dialog";
import { ReadingEditDialog } from "@/components/admin/reading-edit-dialog";
import { Button } from "@/components/ui/button";
import { deleteFeedback } from "@/lib/services/admin-reviews";

interface FeedbackItem {
  id: string;
  message: string;
  name: string | null;
  email: string | null;
  question_id: string | null;
  url: string | null;
  created_at: string;
}

type EditTarget =
  | { type: "question"; questionId: string }
  | { type: "reading"; topicId: string };

function parseStudyUrl(
  url: string | null,
): { topicId: string; mode: string } | null {
  if (!url) return null;
  const match = url.match(
    /\/topics\/([0-9a-f-]{36})\/(quiz|flashcards|reading)/,
  );
  if (!match) return null;
  return { topicId: match[1], mode: match[2] };
}

function getEditTarget(
  item: FeedbackItem,
): { target: EditTarget; label: string } | null {
  const parsed = parseStudyUrl(item.url);

  if (item.question_id) {
    return {
      target: { type: "question", questionId: item.question_id },
      label: "admin.editQuestion",
    };
  }
  if (parsed?.mode === "reading") {
    return {
      target: { type: "reading", topicId: parsed.topicId },
      label: "admin.editReading",
    };
  }
  // Legacy quiz/flashcard without question_id — no inline edit possible
  return null;
}

export function FeedbackClient({ items }: { items: FeedbackItem[] }) {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t("admin.noItems")}
      </p>
    );
  }

  return (
    <>
      {editTarget?.type === "question" && (
        <QuestionEditDialog
          questionId={editTarget.questionId}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onSaved={() => router.refresh()}
        />
      )}
      {editTarget?.type === "reading" && (
        <ReadingEditDialog
          topicId={editTarget.topicId}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onSaved={() => router.refresh()}
        />
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const edit = getEditTarget(item);

          return (
            <div key={item.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  {edit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTarget(edit.target)}
                    >
                      {t(edit.label)}
                    </Button>
                  )}
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
              </div>
              {item.name && <p className="text-sm font-medium">{item.name}</p>}
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
          );
        })}
      </div>
    </>
  );
}
