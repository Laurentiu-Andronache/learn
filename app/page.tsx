import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AnonymousLoginButton } from "@/components/anonymous-login-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations();

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Hero */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-4 py-16 space-y-6 overflow-hidden">
        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)] pointer-events-none" />

        {user ? (
          <div className="relative z-10 space-y-6">
            <div className="space-y-4 max-w-2xl">
              <h1 className="font-display text-6xl sm:text-7xl tracking-tighter">
                {t("landing.welcomeBack")}
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl mx-auto">
                {t("landing.readyToContinue")}
              </p>
            </div>
            <Button asChild size="lg" className="shadow-glow hover:shadow-glow-lg">
              <Link href="/topics">{t("landing.continueLearning")}</Link>
            </Button>
          </div>
        ) : (
          <div className="relative z-10 space-y-6">
            <div className="space-y-4 max-w-2xl">
              <h1 className="font-display text-6xl sm:text-7xl tracking-tighter">
                {t.rich("landing.heroRich", {
                  highlight: (chunks) => (
                    <span className="text-primary">{chunks}</span>
                  ),
                  free: (chunks) => (
                    <span className="bg-gradient-to-r from-violet-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
                      {chunks}
                    </span>
                  ),
                })}
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl mx-auto">
                {t("landing.subtitle")}
              </p>
            </div>
            <div className="flex flex-row gap-3 w-full max-w-sm mx-auto">
              <Button asChild size="lg" className="flex-1 min-h-[2.75rem] shadow-glow hover:shadow-glow-lg">
                <Link href="/auth/sign-up">{t("landing.cta")}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="flex-1 min-h-[2.75rem]">
                <Link href="/auth/login">{t("nav.login")}</Link>
              </Button>
            </div>
            <div className="w-full max-w-sm mx-auto">
              <AnonymousLoginButton />
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-3">
          {[
            { icon: "\u{1F9E0}", key: "fsrs" },
            { icon: "\u{1F30D}", key: "bilingual" },
            { icon: "\u{1F4DA}", key: "modes" },
          ].map((feature, i) => (
            <Card
              key={feature.key}
              className="hover:ring-primary/20 hover:shadow-glow-sm transition-all duration-200"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <CardContent className="pt-6 text-center space-y-2 animate-fade-up" style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "backwards" }}>
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="font-semibold text-lg">
                  {t(`landing.features.${feature.key}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`landing.features.${feature.key}.description`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
