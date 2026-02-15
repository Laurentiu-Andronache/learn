"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedScoreProps {
  value: number;
  className?: string;
  showRing?: boolean;
}

export function AnimatedScore({ value, className, showRing = false }: AnimatedScoreProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = performance.now();
    const duration = 1000;

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(eased * value));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (circumference * display) / 100;

  return (
    <div className={cn(
      "relative inline-flex items-center justify-center",
      showRing && "w-[120px] h-[120px]",
      className
    )}>
      {showRing && (
        <svg className="absolute -rotate-90" width="120" height="120" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-100"
          />
        </svg>
      )}
      <span className={cn("font-display font-bold tabular-nums", showRing ? "text-4xl" : "text-5xl")}>
        {display}%
      </span>
    </div>
  );
}
