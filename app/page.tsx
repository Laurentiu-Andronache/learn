import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnonymousLoginButton } from "@/components/anonymous-login-button";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 space-y-6">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            Master Any Topic with{" "}
            <span className="text-primary">Science-Backed Learning</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Bilingual quiz and flashcard app powered by FSRS spaced repetition.
            Study smarter, not harder.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button asChild size="lg" className="flex-1">
            <Link href="/auth/sign-up">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link href="/auth/login">Log In</Link>
          </Button>
        </div>
        <div className="w-full max-w-sm">
          <AnonymousLoginButton />
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-4xl">🧠</div>
              <h3 className="font-semibold text-lg">Spaced Repetition</h3>
              <p className="text-sm text-muted-foreground">
                FSRS algorithm schedules reviews at optimal intervals for
                long-term retention.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-4xl">🌍</div>
              <h3 className="font-semibold text-lg">Bilingual</h3>
              <p className="text-sm text-muted-foreground">
                Full English and Spanish support for all content and interface.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-4xl">📚</div>
              <h3 className="font-semibold text-lg">Multiple Study Modes</h3>
              <p className="text-sm text-muted-foreground">
                Quiz, flashcard, and reading modes to match your learning style.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
