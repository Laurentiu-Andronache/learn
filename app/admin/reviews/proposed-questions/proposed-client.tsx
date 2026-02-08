"use client";

import { ReviewQueue } from "@/components/admin/review-queue";
import { updateProposedQuestionStatus, deleteProposedQuestion } from "@/lib/services/admin-reviews";

interface ProposedItem {
  id: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  question_en: string;
  question_es: string;
  type: string;
}

export function ProposedQueueClient({ items }: { items: ProposedItem[] }) {
  return (
    <ReviewQueue
      items={items}
      onUpdateStatus={updateProposedQuestionStatus}
      onDelete={deleteProposedQuestion}
      statusOptions={[
        { value: "approved", label: "Approve" },
        { value: "rejected", label: "Reject", variant: "destructive" },
      ]}
      renderItem={(item) => (
        <div>
          <p className="text-sm font-medium">{item.question_en}</p>
          <p className="text-xs text-muted-foreground">{item.type}</p>
        </div>
      )}
    />
  );
}
