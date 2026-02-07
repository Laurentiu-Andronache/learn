import { getReportsList } from "@/lib/services/admin-reviews";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const items = await getReportsList();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Question Reports</h1>
      <ReportsClient items={items} />
    </div>
  );
}
