import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight">
          LEARN
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/themes">Themes</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/settings">Settings</Link>
              </Button>
              <LogoutButton />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Log In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
