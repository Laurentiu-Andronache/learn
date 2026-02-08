import { getFeedbackList } from "@/lib/services/admin-reviews";
import { FeedbackClient } from "../feedback/feedback-client";

export default async function ContentIssuesPage() {
  const items = await getFeedbackList("content");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Issues</h1>
      <FeedbackClient items={items} />
    </div>
  );
}
