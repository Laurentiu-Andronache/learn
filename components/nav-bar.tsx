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
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight ml-4">
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
