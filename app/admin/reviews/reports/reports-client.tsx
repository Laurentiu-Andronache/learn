"use client";

import { ReviewQueue } from "@/components/admin/review-queue";
import { updateReportStatus } from "@/lib/services/admin-reviews";

interface ReportItem {
  id: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  issue_type: string;
  description: string;
  question: { question_en: string; question_es: string } | null;
}

export function ReportsClient({ items }: { items: ReportItem[] }) {
  return (
    <ReviewQueue
      items={items}
      onUpdateStatus={updateReportStatus}
      statusOptions={[
        { value: "reviewing", label: "Reviewing" },
        { value: "resolved", label: "Resolve" },
        { value: "dismissed", label: "Dismiss", variant: "destructive" },
      ]}
      renderItem={(item) => (
        <div>
          <p className="text-sm font-medium">{item.issue_type}</p>
          <p className="text-sm">{item.description}</p>
          {item.question && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Q: {item.question.question_en}
            </p>
          )}
        </div>
      )}
    />
  );
}
