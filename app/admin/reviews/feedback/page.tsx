import { getFeedbackList } from "@/lib/services/admin-reviews";
import { FeedbackClient } from "./feedback-client";

export default async function FeedbackPage() {
  const items = await getFeedbackList();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Feedback</h1>
      <FeedbackClient items={items} />
    </div>
  );
}
