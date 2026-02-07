import { getProposedQuestionsList } from "@/lib/services/admin-reviews";
import { ProposedQueueClient } from "./proposed-client";

export default async function ProposedQuestionsPage() {
  const items = await getProposedQuestionsList();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Proposed Questions</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ProposedQueueClient items={items as any} />
    </div>
  );
}
