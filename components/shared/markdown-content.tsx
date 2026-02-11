"use client";

import { createContext, useContext, useMemo, useRef } from "react";
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

const TTSContext = createContext<{
  onBlockClick?: (el: HTMLElement) => void;
  playingEl?: HTMLElement | null;
  ttsPaused?: boolean;
}>({});

function TTSBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { onBlockClick, playingEl, ttsPaused } = useContext(TTSContext);
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

// Stable module-level constant — never recreated, so React reconciles TTSBlock
// in place instead of unmounting/remounting (which would destroy ref identity).
const markdownComponents = {
  a: ({
    href,
    title,
    children,
  }: {
    href?: string;
    title?: string;
    children?: React.ReactNode;
  }) => {
    if (href === "tooltip" && title) {
      return (
        <GlossaryTerm term={String(children)} explanation={title} />
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
  p: ({ children }: { children?: React.ReactNode }) => (
    <TTSBlock>{children}</TTSBlock>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <TTSBlock className="text-2xl font-bold mt-6 mb-3">{children}</TTSBlock>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <TTSBlock className="text-xl font-bold mt-5 mb-2">{children}</TTSBlock>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <TTSBlock className="text-lg font-semibold mt-4 mb-2">{children}</TTSBlock>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <TTSBlock className="text-base font-semibold mt-3 mb-1">
      {children}
    </TTSBlock>
  ),
  h5: ({ children }: { children?: React.ReactNode }) => (
    <TTSBlock className="text-sm font-semibold mt-3 mb-1">
      {children}
    </TTSBlock>
  ),
  h6: ({ children }: { children?: React.ReactNode }) => (
    <TTSBlock className="text-sm font-semibold mt-2 mb-1">
      {children}
    </TTSBlock>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <TTSBlock className="list-item">{children}</TTSBlock>
  ),
};

export function MarkdownContent({
  text,
  className,
  onBlockClick,
  playingEl,
  ttsPaused,
}: MarkdownContentProps) {
  const processed = preprocessTooltips(text);
  const ttsValue = useMemo(
    () => ({ onBlockClick, playingEl, ttsPaused }),
    [onBlockClick, playingEl, ttsPaused],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className={className}>
        <TTSContext.Provider value={ttsValue}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {processed}
          </ReactMarkdown>
        </TTSContext.Provider>
      </div>
    </TooltipProvider>
  );
}
