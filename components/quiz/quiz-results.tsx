"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface QuizAnswer {
  questionId: string;
  questionText: string;
  selectedIndex: number | null;
  correctIndex: number;
  options: string[];
  wasCorrect: boolean;
  wasIdk: boolean;
  categoryName: string;
  categoryColor: string | null;
  timeMs: number;
}

interface QuizResultsProps {
  answers: QuizAnswer[];
  totalTimeMs: number;
  topicId: string;
  onRetryFailed: () => void;
  saving?: boolean;
}

export function QuizResults({
  answers,
  totalTimeMs,
  topicId,
  onRetryFailed,
  saving = false,
}: QuizResultsProps) {
  const t = useTranslations("quiz.results");

  const correct = answers.filter((a) => a.wasCorrect).length;
  const total = answers.length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const minutes = Math.floor(totalTimeMs / 60000);
  const seconds = Math.floor((totalTimeMs % 60000) / 1000);

  // Category breakdown
  const categoryMap = new Map<
    string,
    { name: string; color: string | null; correct: number; total: number }
  >();
  for (const a of answers) {
    const existing = categoryMap.get(a.categoryName) || {
      name: a.categoryName,
      color: a.categoryColor,
      correct: 0,
      total: 0,
    };
    existing.total++;
    if (a.wasCorrect) existing.correct++;
    categoryMap.set(a.categoryName, existing);
  }

  const missed = answers.filter((a) => !a.wasCorrect);

  // Confetti burst on good score
  useEffect(() => {
    if (percent < 80) return;

    let rafId: number | null = null;
    const end = Date.now() + 1500;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60 + Math.random() * 60,
        spread: 55,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
      });
      if (Date.now() < end) rafId = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      confetti.reset();
    };
  }, [percent]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      {/* Score card */}
      <Card>
        <CardContent className="pt-6 text-center space-y-2">
          {percent >= 80 && <p className="text-2xl">{t("congratulations")}</p>}
          <p className="text-5xl font-bold tabular-nums">{percent}%</p>
          <p className="text-muted-foreground">
            {t("score")}: {correct}/{total}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("time")}: {minutes}m {seconds}s
          </p>
          {saving && (
            <p className="text-xs text-muted-foreground animate-pulse">
              Saving results...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Category breakdown */}
      {categoryMap.size > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("categoryBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(categoryMap.values()).map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    {cat.color && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    {cat.name}
                  </span>
                  <span className="tabular-nums">
                    {cat.correct}/{cat.total} (
                    {Math.round((cat.correct / cat.total) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-question review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("questionReview")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {answers.map((a, i) => (
            <div
              key={a.questionId}
              className={cn(
                "rounded-lg border p-3 space-y-1",
                a.wasCorrect && "border-green-500/30 bg-green-500/5",
                !a.wasCorrect && !a.wasIdk && "border-red-500/30 bg-red-500/5",
                a.wasIdk && "border-yellow-500/30 bg-yellow-500/5",
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "text-sm font-bold shrink-0 mt-0.5",
                    a.wasCorrect && "text-green-600",
                    !a.wasCorrect && !a.wasIdk && "text-red-600",
                    a.wasIdk && "text-yellow-600",
                  )}
                >
                  {a.wasCorrect ? "\u2713" : a.wasIdk ? "?" : "\u2717"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    <span className="text-muted-foreground">{i + 1}.</span>{" "}
                    {a.questionText}
                  </p>
                  {!a.wasCorrect && (
                    <div className="mt-1 text-xs space-y-0.5">
                      {a.selectedIndex !== null && (
                        <p className="text-red-600 dark:text-red-400">
                          {t("yourAnswer")}: {a.options[a.selectedIndex]}
                        </p>
                      )}
                      {a.wasIdk && (
                        <p className="text-yellow-600 dark:text-yellow-400 italic">
                          Skipped
                        </p>
                      )}
                      <p className="text-green-600 dark:text-green-400">
                        {t("correctAnswer")}: {a.options[a.correctIndex]}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        {missed.length > 0 && (
          <Button onClick={onRetryFailed} variant="outline" className="flex-1">
            {t("retryFailed")}
          </Button>
        )}
        <Button asChild className="flex-1">
          <Link href={`/topics/${topicId}`}>{t("backToTopics")}</Link>
        </Button>
      </div>
    </div>
  );
}
