import { getFeedbackList } from "@/lib/services/admin-reviews";
import { FeedbackClient } from "../feedback/feedback-client";

export default async function FeatureRequestsPage() {
  const items = await getFeedbackList("feature");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Feature Requests</h1>
      <FeedbackClient items={items} />
    </div>
  );
}
