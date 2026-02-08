"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuestionReportForm } from "@/components/feedback/question-report-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Language, Question } from "@/lib/types/database";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "answering" | "feedback";

export interface QuizCardProps {
  question: Question;
  locale: Language;
  categoryName: string;
  categoryColor: string | null;
  onAnswer: (wasCorrect: boolean | null, timeMs: number) => void;
}

// ─── Fisher-Yates Shuffle (skip for true/false) ─────────────────────────────

function shuffleOptions(options: string[], correctIndex: number) {
  const indices = options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    options: indices.map((i) => options[i]),
    correctIndex: indices.indexOf(correctIndex),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuizCard({
  question,
  locale,
  categoryName,
  categoryColor,
  onAnswer,
}: QuizCardProps) {
  const t = useTranslations("quiz");
  const tCommon = useTranslations("common");
  const tFeedback = useTranslations("feedback");
  const startTime = useRef(Date.now());

  const [phase, setPhase] = useState<Phase>("answering");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const questionText =
    locale === "es" ? question.question_es : question.question_en;
  const rawOptions =
    (locale === "es" ? question.options_es : question.options_en) ?? [];
  const explanation =
    locale === "es" ? question.explanation_es : question.explanation_en;
  const extra = locale === "es" ? question.extra_es : question.extra_en;
  const correctIdx = question.correct_index ?? 0;

  // Shuffle once per question (not true/false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-shuffle only when question changes
  const shuffled = useMemo(() => {
    if (question.type === "true_false") {
      return { options: rawOptions, correctIndex: correctIdx };
    }
    return shuffleOptions(rawOptions, correctIdx);
  }, [question.id]);

  // Reset state when question changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only on question change
  useEffect(() => {
    setPhase("answering");
    setSelectedIndex(null);
    startTime.current = Date.now();
  }, [question.id]);

  const wasCorrect =
    selectedIndex !== null && selectedIndex === shuffled.correctIndex;

  const handleSelect = useCallback(
    (index: number) => {
      if (phase !== "answering") return;
      setSelectedIndex(index);
      setPhase("feedback");
    },
    [phase],
  );

  const handleIdk = useCallback(() => {
    if (phase !== "answering") return;
    setSelectedIndex(null);
    setPhase("feedback");
  }, [phase]);

  const handleNext = useCallback(() => {
    const timeMs = Date.now() - startTime.current;
    if (selectedIndex === null) {
      // IDK
      onAnswer(null, timeMs);
    } else if (selectedIndex === shuffled.correctIndex) {
      // Correct
      onAnswer(true, timeMs);
    } else {
      // Incorrect
      onAnswer(false, timeMs);
    }
  }, [selectedIndex, shuffled.correctIndex, onAnswer]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="pt-6 space-y-6">
        {/* Header: category */}
        <div className="flex items-center">
          <Badge
            variant="outline"
            className="text-xs"
            style={
              categoryColor
                ? { borderColor: categoryColor, color: categoryColor }
                : undefined
            }
          >
            {categoryName}
          </Badge>
        </div>

        {/* Question text */}
        <p className="text-xl font-semibold leading-relaxed">{questionText}</p>

        {/* Options */}
        <div className="space-y-3">
          {shuffled.options.map((option, i) => {
            const isSelected = selectedIndex === i;
            const isCorrectOption = i === shuffled.correctIndex;
            const showResult = phase === "feedback";

            return (
              <button
                type="button"
                key={`${question.id}-${i}`}
                onClick={() => handleSelect(i)}
                disabled={phase === "feedback"}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-all duration-200",
                  phase === "answering" &&
                    "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
                  phase === "feedback" && "cursor-default",
                  showResult &&
                    isCorrectOption &&
                    "border-green-500 bg-green-500/10",
                  showResult &&
                    isSelected &&
                    !isCorrectOption &&
                    "border-red-500 bg-red-500/10",
                  showResult && !isSelected && !isCorrectOption && "opacity-50",
                  !showResult && "border-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium",
                      showResult &&
                        isCorrectOption &&
                        "border-green-500 text-green-600",
                      showResult &&
                        isSelected &&
                        !isCorrectOption &&
                        "border-red-500 text-red-600",
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm">{option}</span>
                  {showResult && isCorrectOption && (
                    <span className="ml-auto text-green-600 dark:text-green-400 font-bold">
                      &#10003;
                    </span>
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <span className="ml-auto text-red-600 dark:text-red-400 font-bold">
                      &#10007;
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* IDK button (answering phase only) */}
        {phase === "answering" && (
          <Button variant="secondary" onClick={handleIdk} className="w-full">
            {t("idk")}
          </Button>
        )}

        {/* Feedback section */}
        {phase === "feedback" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Result banner */}
            <div
              className={cn(
                "rounded-lg px-4 py-3 text-sm font-medium",
                wasCorrect
                  ? "bg-green-500/10 text-green-700 dark:text-green-300"
                  : "bg-red-500/10 text-red-700 dark:text-red-300",
              )}
            >
              {wasCorrect ? t("correct") : t("incorrect")}
            </div>

            {/* Explanation */}
            {explanation && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm leading-relaxed">{explanation}</p>
              </div>
            )}

            {/* Extra: Learn More */}
            {extra && (
              <details className="rounded-lg bg-blue-500/10 border border-blue-500/20">
                <summary className="px-4 py-2.5 cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">
                  {t("learnMore")}
                </summary>
                <div className="px-4 pb-3 text-sm leading-relaxed text-blue-900 dark:text-blue-200">
                  {extra}
                </div>
              </details>
            )}

            {/* Report question */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setReportOpen(true)}
              >
                &#9873; {tFeedback("reportQuestion")}
              </Button>
            </div>
            <QuestionReportForm
              questionId={question.id}
              questionText={
                locale === "es" && question.question_es
                  ? question.question_es
                  : question.question_en
              }
              open={reportOpen}
              onOpenChange={setReportOpen}
            />

            {/* Next button */}
            <Button onClick={handleNext} className="w-full" size="lg">
              {tCommon("next")} &rarr;
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
