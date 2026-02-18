import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        flashcard:
          "border-[hsl(var(--flashcard-accent)/0.3)] bg-[hsl(var(--flashcard-accent)/0.1)] text-[hsl(var(--flashcard-accent))]",
        quiz: "border-[hsl(var(--quiz-accent)/0.3)] bg-[hsl(var(--quiz-accent)/0.1)] text-[hsl(var(--quiz-accent))]",
        reading:
          "border-[hsl(var(--reading-accent)/0.3)] bg-[hsl(var(--reading-accent)/0.1)] text-[hsl(var(--reading-accent))]",
        again:
          "border-[hsl(var(--rating-again)/0.3)] bg-[hsl(var(--rating-again)/0.1)] text-[hsl(var(--rating-again))]",
        hard: "border-[hsl(var(--rating-hard)/0.3)] bg-[hsl(var(--rating-hard)/0.1)] text-[hsl(var(--rating-hard))]",
        good: "border-[hsl(var(--rating-good)/0.3)] bg-[hsl(var(--rating-good)/0.1)] text-[hsl(var(--rating-good))]",
        easy: "border-[hsl(var(--rating-easy)/0.3)] bg-[hsl(var(--rating-easy)/0.1)] text-[hsl(var(--rating-easy))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
