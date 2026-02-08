import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Check admin access
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", user.email!)
    .maybeSingle();

  if (!admin) redirect("/topics");

  return (
    <div className="flex min-h-[calc(100vh-8rem)]">
      <aside className="w-56 border-r p-4 hidden md:block">
        <nav className="space-y-1">
          <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
            Admin
          </h2>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start"
            size="sm"
          >
            <Link href="/admin">Dashboard</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start"
            size="sm"
          >
            <Link href="/admin/topics">Topics</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start"
            size="sm"
          >
            <Link href="/admin/questions">Questions</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start"
            size="sm"
          >
            <Link href="/admin/reviews/feedback">Feedback</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start"
            size="sm"
          >
            <Link href="/admin/reviews/reports">Reports</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start"
            size="sm"
          >
            <Link href="/admin/reviews/proposed-questions">Proposed Qs</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start"
            size="sm"
          >
            <Link href="/admin/reviews/theme-proposals">Theme Ideas</Link>
          </Button>
        </nav>
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
