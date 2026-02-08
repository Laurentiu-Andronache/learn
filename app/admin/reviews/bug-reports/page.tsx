import { getFeedbackList } from "@/lib/services/admin-reviews";
import { FeedbackClient } from "../feedback/feedback-client";

export default async function BugReportsPage() {
  const items = await getFeedbackList("bug");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bug Reports</h1>
      <FeedbackClient items={items} />
    </div>
  );
}
