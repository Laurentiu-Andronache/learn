"use client";

import { ChevronUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "footer-collapsed";
const SM_BREAKPOINT = 640;

interface CollapsibleFooterProps {
  tagline: string;
  aboutLabel: string;
  showLabel: string;
  hideLabel: string;
}

export function CollapsibleFooter({
  tagline,
  aboutLabel,
  showLabel,
  hideLabel,
}: CollapsibleFooterProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === "true");
    } else {
      setCollapsed(window.innerWidth < SM_BREAKPOINT);
    }
    setMounted(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  return (
    <footer className="border-t border-border/50">
      <div className="container flex items-center">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? showLabel : hideLabel}
          className="p-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <ChevronUp
            className={`h-4 w-4 transition-transform duration-300 ${
              mounted && !collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${
          mounted && collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 text-sm text-muted-foreground pr-28">
            <p className="ml-4">
              <span className="font-display">LEARN</span> — {tagline}
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/about"
                className="hover:text-primary transition-colors"
              >
                {aboutLabel}
              </Link>
              <a
                href="https://launcher.finance"
                target="_blank"
                rel="noopener"
                className="hover:text-primary transition-colors"
              >
                Launcher
              </a>
              <a
                href="https://x.com/laur_science"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
                aria-label="X (Twitter)"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="sr-only">X (Twitter)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
