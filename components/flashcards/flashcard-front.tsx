import { useTranslations } from "next-intl";
import type { RefObject } from "react";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FlashcardFrontProps {
  questionText: string;
  hasBeenRevealed: boolean;
  questionRef: RefObject<HTMLParagraphElement | null>;
  playingEl: HTMLElement | null;
}

export function FlashcardFront({
  questionText,
  hasBeenRevealed,
  questionRef,
  playingEl,
}: FlashcardFrontProps) {
  const tf = useTranslations("flashcard");

  return (
    <Card className="absolute inset-0 [backface-visibility:hidden] flex flex-col items-center justify-center p-6 text-center border-[hsl(var(--flashcard-accent)/0.2)]">
      <div
        ref={questionRef}
        className={cn(
          "text-lg font-semibold mb-4 transition-colors duration-200",
          playingEl === questionRef.current &&
            "bg-[hsl(var(--primary)/0.10)] rounded-md px-2 -mx-2",
        )}
      >
        <MarkdownContent
          text={questionText}
          className="text-lg font-semibold"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {hasBeenRevealed ? tf("tapToSeeAnswer") : tf("tapToReveal")}
      </p>
    </Card>
  );
}
