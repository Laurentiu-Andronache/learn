"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlossaryTerm } from "@/components/reading/glossary-term";
import { preprocessTooltips } from "@/lib/markdown/preprocess-tooltips";

interface MarkdownContentProps {
  text: string;
  className?: string;
}

export function MarkdownContent({ text, className }: MarkdownContentProps) {
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
              return (
                <a href={href} title={title}>
                  {children}
                </a>
              );
            },
            // Render paragraphs as spans to avoid nested <p> issues
            // when MarkdownContent is used inside existing <p> elements
            p: ({ children }) => <span className="block">{children}</span>,
          }}
        >
          {processed}
        </ReactMarkdown>
      </div>
    </TooltipProvider>
  );
}
