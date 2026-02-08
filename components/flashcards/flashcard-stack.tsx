"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { QuestionReportForm } from "@/components/feedback/question-report-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FlashcardProgress } from "./flashcard-progress";

interface FlashcardQuestion {
  id: string;
  question_en: string;
  question_es: string;
  explanation_en: string | null;
  explanation_es: string | null;
  extra_en: string | null;
  extra_es: string | null;
}

interface FlashcardStackProps {
  questions: FlashcardQuestion[];
  locale: "en" | "es";
  onGrade: (questionId: string, knew: boolean) => void;
  onSuspend: (questionId: string) => void;
  onComplete: (results: { knew: string[]; didntKnow: string[] }) => void;
}

export function FlashcardStack({
  questions,
  locale,
  onGrade,
  onSuspend,
  onComplete,
}: FlashcardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knew, setKnew] = useState<string[]>([]);
  const [didntKnow, setDidntKnow] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const t = useTranslations("feedback");
  const tf = useTranslations("flashcard");
  const tq = useTranslations("quiz");

  const advance = useCallback(
    (knewIt: boolean) => {
      const current = questions[currentIndex];
      if (!current) return;
      const qId = current.id;
      onGrade(qId, knewIt);

      const newKnew = knewIt ? [...knew, qId] : knew;
      const newDidntKnow = knewIt ? didntKnow : [...didntKnow, qId];

      if (knewIt) {
        setKnew(newKnew);
      } else {
        setDidntKnow(newDidntKnow);
      }

      if (currentIndex + 1 >= questions.length) {
        onComplete({ knew: newKnew, didntKnow: newDidntKnow });
      } else {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setIsFlipped(false);
      }
    },
    [
      currentIndex,
      questions,
      knew,
      didntKnow,
      onGrade,
      onComplete,
    ],
  );

  const current = questions[currentIndex];
  if (!current) return null;

  const questionText =
    locale === "es" ? current.question_es : current.question_en;
  const explanation =
    locale === "es" ? current.explanation_es : current.explanation_en;
  const extra = locale === "es" ? current.extra_es : current.extra_en;

  const handleFlip = () => {
    if (!isFlipped) setIsFlipped(true);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      <FlashcardProgress
        current={currentIndex}
        total={questions.length}
        knew={knew.length}
        didntKnow={didntKnow.length}
      />

      {/* Flashcard */}
      {/* biome-ignore lint/a11y/useSemanticElements: div needed for 3D perspective container */}
      <div
        role="button"
        tabIndex={0}
        className="relative w-full aspect-[3/2] cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={handleFlip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleFlip();
        }}
      >
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-300",
            "[transform-style:preserve-3d]",
            isFlipped && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Front */}
          <Card className="absolute inset-0 [backface-visibility:hidden] flex flex-col items-center justify-center p-6 text-center">
            <p className="text-lg font-semibold mb-4">{questionText}</p>
            <p className="text-sm text-muted-foreground">{tf("tapToReveal")}</p>
          </Card>

          {/* Back */}
          <Card className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col p-6 overflow-y-auto">
            <div className="flex-1 space-y-3">
              {explanation && (
                <div>
                  <p className="text-sm font-medium mb-1">{tf("answer")}</p>
                  <p className="text-sm text-muted-foreground">{explanation}</p>
                </div>
              )}
              {extra && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    {tq("learnMore")}
                  </p>
                  <p className="text-xs text-muted-foreground">{extra}</p>
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setReportOpen(true);
                }}
              >
                &#9873; {t("reportQuestion")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSuspend(current.id);
                }}
              >
                ⊘ {tq("suspend")}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <QuestionReportForm
        questionId={current.id}
        questionText={locale === "es" && current.question_es ? current.question_es : current.question_en}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />

      {/* Grading buttons - only show when flipped */}
      {isFlipped && (
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => advance(false)}
          >
            {tf("didntKnow")}
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => advance(true)}
          >
            {tf("knewIt")}
          </Button>
        </div>
      )}

      {/* Progress indicators */}
      <div className="flex justify-center gap-4 text-sm">
        <span className="text-green-600">✓ {knew.length}</span>
        <span className="text-red-600">✗ {didntKnow.length}</span>
      </div>
    </div>
  );
}
