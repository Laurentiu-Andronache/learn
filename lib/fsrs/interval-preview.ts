import { createEmptyCard, fsrs, generatorParameters, Rating } from "ts-fsrs";
import { toCard } from "@/lib/fsrs/card-mapper";
import type { UserCardState } from "@/lib/types/database";

const f = fsrs(generatorParameters({ enable_fuzz: true }));

export function getIntervalPreviews(
  cardState: UserCardState | null,
): Record<1 | 2 | 3 | 4, string> {
  const card = cardState ? toCard(cardState) : createEmptyCard();
  const now = new Date();
  const scheduled = f.repeat(card, now);
  return {
    1: formatInterval(scheduled[Rating.Again].card.due, now),
    2: formatInterval(scheduled[Rating.Hard].card.due, now),
    3: formatInterval(scheduled[Rating.Good].card.due, now),
    4: formatInterval(scheduled[Rating.Easy].card.due, now),
  };
}

function formatInterval(due: Date, now: Date): string {
  const diffMs = due.getTime() - now.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}
