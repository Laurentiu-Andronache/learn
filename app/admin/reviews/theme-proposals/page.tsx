import { getThemeProposalsList } from "@/lib/services/admin-reviews";
import { ThemeProposalsClient } from "./theme-proposals-client";

export default async function ThemeProposalsPage() {
  const items = await getThemeProposalsList();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Topic Ideas</h1>
      <ThemeProposalsClient items={items} />
    </div>
  );
}
