"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GlossaryTermProps {
  term: string;
  explanation: string;
}

export function GlossaryTerm({ term, explanation }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <span
          className="underline decoration-dotted decoration-[hsl(var(--reading-accent)/0.4)] underline-offset-2 cursor-help"
          onClick={(e) => { e.stopPropagation(); setOpen((prev) => !prev); }}
        >
          {term}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm leading-relaxed">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}
