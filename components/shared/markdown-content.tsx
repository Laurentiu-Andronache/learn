"use client";

import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlossaryTerm } from "@/components/reading/glossary-term";
import { preprocessTooltips } from "@/lib/markdown/preprocess-tooltips";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  text: string;
  className?: string;
  onBlockClick?: (el: HTMLElement) => void;
  playingEl?: HTMLElement | null;
  ttsPaused?: boolean;
}

function TTSBlock({
  children,
  className,
  onBlockClick,
  playingEl,
  ttsPaused,
}: {
  children: React.ReactNode;
  className?: string;
  onBlockClick?: (el: HTMLElement) => void;
  playingEl?: HTMLElement | null;
  ttsPaused?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isActive = playingEl !== null && ref.current === playingEl;

  if (!onBlockClick) {
    return <span className={cn("block", className)}>{children}</span>;
  }

  return (
    <span
      ref={ref}
      className={cn(
        "block",
        className,
        "cursor-pointer transition-colors duration-200 rounded-sm",
        isActive && !ttsPaused && "animate-tts-pulse",
        isActive && ttsPaused && "bg-[hsl(var(--primary)/0.10)]",
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (ref.current) onBlockClick(ref.current);
      }}
    >
      {children}
    </span>
  );
}

export function MarkdownContent({
  text,
  className,
  onBlockClick,
  playingEl,
  ttsPaused,
}: MarkdownContentProps) {
  const processed = preprocessTooltips(text);

  return (
    <TooltipProvider delayDuration={200}>
      <div className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, title, children }) => {
              if (href === "tooltip" && title) {
                return (
                  <GlossaryTerm
                    term={String(children)}
                    explanation={title}
                  />
                );
              }
              const isExternal =
                href?.startsWith("http://") || href?.startsWith("https://");
              return (
                <a
                  href={href}
                  title={title}
                  {...(isExternal
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {children}
                </a>
              );
            },
            p: ({ children }) => (
              <TTSBlock onBlockClick={onBlockClick} playingEl={playingEl} ttsPaused={ttsPaused}>
                {children}
              </TTSBlock>
            ),
            h1: ({ children }) => (
              <TTSBlock
                className="text-2xl font-bold mt-6 mb-3"
                onBlockClick={onBlockClick}
                playingEl={playingEl}
              >
                {children}
              </TTSBlock>
            ),
            h2: ({ children }) => (
              <TTSBlock
                className="text-xl font-bold mt-5 mb-2"
                onBlockClick={onBlockClick}
                playingEl={playingEl}
              >
                {children}
              </TTSBlock>
            ),
            h3: ({ children }) => (
              <TTSBlock
                className="text-lg font-semibold mt-4 mb-2"
                onBlockClick={onBlockClick}
                playingEl={playingEl}
              >
                {children}
              </TTSBlock>
            ),
            h4: ({ children }) => (
              <TTSBlock
                className="text-base font-semibold mt-3 mb-1"
                onBlockClick={onBlockClick}
                playingEl={playingEl}
              >
                {children}
              </TTSBlock>
            ),
            h5: ({ children }) => (
              <TTSBlock
                className="text-sm font-semibold mt-3 mb-1"
                onBlockClick={onBlockClick}
                playingEl={playingEl}
              >
                {children}
              </TTSBlock>
            ),
            h6: ({ children }) => (
              <TTSBlock
                className="text-sm font-semibold mt-2 mb-1"
                onBlockClick={onBlockClick}
                playingEl={playingEl}
              >
                {children}
              </TTSBlock>
            ),
            li: ({ children }) => (
              <TTSBlock
                className="list-item"
                onBlockClick={onBlockClick}
                playingEl={playingEl}
              >
                {children}
              </TTSBlock>
            ),
          }}
        >
          {processed}
        </ReactMarkdown>
      </div>
    </TooltipProvider>
  );
}
