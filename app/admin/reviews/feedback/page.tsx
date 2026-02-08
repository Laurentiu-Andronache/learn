import { getFeedbackList } from "@/lib/services/admin-reviews";

export default async function FeedbackPage() {
  const items = await getFeedbackList();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Feedback</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">No feedback yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                {item.type && (
                  <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {item.type}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm">{item.message}</p>
              {item.url && (
                <p className="text-xs text-muted-foreground">
                  Page: {item.url}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
