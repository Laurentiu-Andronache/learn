import { useEffect } from "react";

interface UseCardHotkeysProps {
  hasBeenRevealed: boolean;
  reportOpen: boolean;
  advance: (rating: 1 | 2 | 3 | 4) => void;
}

export function useCardHotkeys({
  hasBeenRevealed,
  reportOpen,
  advance,
}: UseCardHotkeysProps) {
  // Keyboard hotkeys: 1=Again, 2=Hard, 3/Space=Good, 4=Easy (only after first reveal)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!hasBeenRevealed) return;
      if (reportOpen) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case "1":
          e.preventDefault();
          advance(1);
          break;
        case "2":
          e.preventDefault();
          advance(2);
          break;
        case "3":
        case " ":
          e.preventDefault();
          advance(3);
          break;
        case "4":
          e.preventDefault();
          advance(4);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasBeenRevealed, advance, reportOpen]);
}
