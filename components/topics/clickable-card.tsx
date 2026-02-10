"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function ClickableCard({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if user clicked an inner link
    const target = e.target as HTMLElement;
    if (target.closest("a")) return;
    router.push(href);
  };

  return (
    <div
      role="link"
      tabIndex={0}
      className={className}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
    >
      {children}
    </div>
  );
}
