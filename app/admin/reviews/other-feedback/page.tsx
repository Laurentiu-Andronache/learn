import { getFeedbackList } from "@/lib/services/admin-reviews";
import { FeedbackClient } from "../feedback/feedback-client";

export default async function OtherFeedbackPage() {
  const items = await getFeedbackList("other");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Other Feedback</h1>
      <FeedbackClient items={items} />
    </div>
  );
}
