import { notFound } from "next/navigation";
import { getFeedbackList } from "@/lib/services/admin-reviews";
import { FeedbackClient } from "../feedback/feedback-client";

const FEEDBACK_TYPES = {
  "bug-reports": { dbType: "bug" as const, heading: "Bug Reports" },
  "feature-requests": {
    dbType: "feature" as const,
    heading: "Feature Requests",
  },
  "content-issues": { dbType: "content" as const, heading: "Content Issues" },
  "other-feedback": { dbType: "other" as const, heading: "Other Feedback" },
} as const;

type FeedbackSlug = keyof typeof FEEDBACK_TYPES;

export function generateStaticParams() {
  return Object.keys(FEEDBACK_TYPES).map((type) => ({ type }));
}

export default async function FeedbackTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const config = FEEDBACK_TYPES[type as FeedbackSlug];
  if (!config) notFound();

  const items = await getFeedbackList(config.dbType);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{config.heading}</h1>
      <FeedbackClient items={items} />
    </div>
  );
}
