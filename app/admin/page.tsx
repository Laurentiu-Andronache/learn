import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

async function getDashboardStats() {
  const supabase = await createClient();

  const [
    { count: themesCount },
    { count: questionsCount },
    { count: usersCount },
    { count: pendingFeedback },
    { count: pendingReports },
    { count: pendingProposedQs },
    { count: pendingThemeProposals },
  ] = await Promise.all([
    supabase.from("themes").select("id", { count: "exact", head: true }),
    supabase.from("questions").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("feedback")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("question_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("proposed_questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("theme_proposals")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    themes: themesCount ?? 0,
    questions: questionsCount ?? 0,
    users: usersCount ?? 0,
    pendingFeedback: pendingFeedback ?? 0,
    pendingReports: pendingReports ?? 0,
    pendingProposedQs: pendingProposedQs ?? 0,
    pendingThemeProposals: pendingThemeProposals ?? 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const reviewItems = [
    {
      label: "Feedback",
      count: stats.pendingFeedback,
      href: "/admin/reviews/feedback",
    },
    {
      label: "Question Reports",
      count: stats.pendingReports,
      href: "/admin/reviews/reports",
    },
    {
      label: "Proposed Questions",
      count: stats.pendingProposedQs,
      href: "/admin/reviews/proposed-questions",
    },
    {
      label: "Theme Proposals",
      count: stats.pendingThemeProposals,
      href: "/admin/reviews/theme-proposals",
    },
  ];

  const totalPending =
    stats.pendingFeedback +
    stats.pendingReports +
    stats.pendingProposedQs +
    stats.pendingThemeProposals;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Themes</CardDescription>
            <CardTitle className="text-3xl">{stats.themes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Questions</CardDescription>
            <CardTitle className="text-3xl">{stats.questions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-3xl">{stats.users}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Pending review queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Review Queue
            {totalPending > 0 && (
              <Badge variant="destructive">{totalPending}</Badge>
            )}
          </CardTitle>
          <CardDescription>Items awaiting admin review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {reviewItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <Badge variant={item.count > 0 ? "default" : "secondary"}>
                  {item.count}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href="/admin/themes"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Manage Themes
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
