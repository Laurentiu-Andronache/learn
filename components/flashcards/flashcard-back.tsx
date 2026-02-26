import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RefObject } from "react";
import { QuestionReportForm } from "@/components/feedback/question-report-form";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface FlashcardBackProps {
  flashcardId: string;
  questionText: string;
  answer: string | null;
  extra: string | null;
  backCardRef: RefObject<HTMLDivElement | null>;
  playingEl: HTMLElement | null;
  paused: boolean;
  reportOpen: boolean;
  onReportOpenChange: (open: boolean) => void;
  onTTSClick: (el: HTMLElement) => void;
  onSuspend: () => void;
}

export function FlashcardBack({
  flashcardId,
  questionText,
  answer,
  extra,
  backCardRef,
  playingEl,
  paused,
  reportOpen,
  onReportOpenChange,
  onTTSClick,
  onSuspend,
}: FlashcardBackProps) {
  const t = useTranslations("feedback");
  const tf = useTranslations("flashcard");
  const tq = useTranslations("quiz");

  return (
    <>
      <Card
        ref={backCardRef}
        className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col p-6 overflow-y-auto border-[hsl(var(--flashcard-accent)/0.2)]"
      >
        <div className="flex-1 space-y-3">
          {answer && (
            <div>
              <p className="text-sm font-medium mb-1">{tf("answer")}</p>
              <MarkdownContent
                text={answer}
                className="text-sm text-muted-foreground"
                onBlockClick={onTTSClick}
                playingEl={playingEl}
                ttsPaused={paused}
              />
            </div>
          )}
          {extra && (
            <details
              key={flashcardId}
              className="group rounded-lg bg-[hsl(var(--flashcard-accent)/0.1)]"
              onClick={(e) => e.stopPropagation()}
            >
              <summary className="pl-1 py-2 cursor-pointer text-sm font-medium text-[hsl(var(--flashcard-accent))] list-none flex items-center gap-1">
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                {tq("learnMore")}
              </summary>
              <div className="pl-1 pb-3">
                <MarkdownContent
                  text={extra}
                  className="text-sm text-muted-foreground"
                  onBlockClick={onTTSClick}
                  playingEl={playingEl}
                  ttsPaused={paused}
                />
              </div>
            </details>
          )}
        </div>
        <div className="mt-2 flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onReportOpenChange(true);
            }}
          >
            &#9873; {t("reportQuestion")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onSuspend();
            }}
          >
            &#8856; {tq("suspend")}
          </Button>
        </div>
      </Card>

      <QuestionReportForm
        flashcardId={flashcardId}
        questionText={questionText}
        open={reportOpen}
        onOpenChange={onReportOpenChange}
      />
    </>
  );
}
