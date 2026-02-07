'use client';

import { ReviewQueue } from '@/components/admin/review-queue';
import { updateThemeProposalStatus } from '@/lib/services/admin-reviews';

interface ThemeProposalItem {
  id: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  title_en: string;
  title_es: string | null;
  description_en: string | null;
}

export function ThemeProposalsClient({ items }: { items: ThemeProposalItem[] }) {
  return (
    <ReviewQueue
      items={items}
      onUpdateStatus={updateThemeProposalStatus}
      statusOptions={[
        { value: 'reviewing', label: 'Reviewing' },
        { value: 'approved', label: 'Approve' },
        { value: 'rejected', label: 'Reject', variant: 'destructive' },
      ]}
      renderItem={(item) => (
        <div>
          <p className="text-sm font-medium">{item.title_en}</p>
          {item.description_en && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.description_en}
            </p>
          )}
        </div>
      )}
    />
  );
}
