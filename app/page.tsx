import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnonymousLoginButton } from "@/components/anonymous-login-button";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations();

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 space-y-6">
        {user ? (
          <>
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
                {t("landing.welcomeBack")}
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl mx-auto">
                {t("landing.readyToContinue")}
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/themes">{t("landing.continueLearning")}</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
                {t.rich("landing.heroRich", {
                  highlight: (chunks) => <span className="text-primary">{chunks}</span>
                })}
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl mx-auto">
                {t("landing.subtitle")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button asChild size="lg" className="flex-1">
                <Link href="/auth/sign-up">{t("landing.cta")}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="flex-1">
                <Link href="/auth/login">{t("nav.login")}</Link>
              </Button>
            </div>
            <div className="w-full max-w-sm">
              <AnonymousLoginButton />
            </div>
          </>
        )}
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-4xl">🧠</div>
              <h3 className="font-semibold text-lg">{t("landing.features.fsrs.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("landing.features.fsrs.description")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-4xl">🌍</div>
              <h3 className="font-semibold text-lg">{t("landing.features.bilingual.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("landing.features.bilingual.description")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-4xl">📚</div>
              <h3 className="font-semibold text-lg">{t("landing.features.modes.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("landing.features.modes.description")}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
