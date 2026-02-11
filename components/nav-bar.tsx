import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", user.email!)
      .maybeSingle();
    isAdmin = !!admin;
  }
  const t = await getTranslations("nav");

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/20 after:to-transparent">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-tight ml-4 dark:bg-gradient-to-r dark:from-primary dark:to-primary/70 dark:bg-clip-text dark:text-transparent font-bold">
          LEARN
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/topics">{t("topics")}</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/settings">{t("settings")}</Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">{t("admin")}</Link>
                </Button>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">{t("login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/sign-up">{t("signUp")}</Link>
              </Button>
            </>
          )}
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-1">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <MobileNav isLoggedIn={!!user} isAdmin={isAdmin} />
        </div>
      </div>
    </nav>
  );
}
