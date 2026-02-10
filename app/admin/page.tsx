import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: topicCount },
    { count: questionCount },
    { count: userCount },
    { count: bugCount },
    { count: featureCount },
    { count: contentCount },
    { count: otherCount },
  ] = await Promise.all([
    supabase
      .from("topics")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("questions").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("type", "bug"),
    supabase
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("type", "feature"),
    supabase
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("type", "content"),
    supabase
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("type", "other"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Topics</CardDescription>
            <CardTitle className="text-3xl">{topicCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Questions</CardDescription>
            <CardTitle className="text-3xl">{questionCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-3xl">{userCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Feedback */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Feedback</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/reviews/bug-reports"
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <span>Bug Reports</span>
            <Badge variant="secondary">{bugCount ?? 0}</Badge>
          </Link>
          <Link
            href="/admin/reviews/feature-requests"
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <span>Feature Requests</span>
            <Badge variant="secondary">{featureCount ?? 0}</Badge>
          </Link>
          <Link
            href="/admin/reviews/content-issues"
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <span>Content Issues</span>
            <Badge variant="secondary">{contentCount ?? 0}</Badge>
          </Link>
          <Link
            href="/admin/reviews/other-feedback"
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <span>Other</span>
            <Badge variant="secondary">{otherCount ?? 0}</Badge>
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href="/admin/topics"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Manage Topics
          </Link>
          <Link
            href="/admin/questions"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Browse Questions
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
