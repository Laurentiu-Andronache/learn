import confetti from "canvas-confetti";

const COLORS = {
  flashcard: ["#a855f7", "#c084fc", "#e879f9", "#d8b4fe"], // violet
  quiz: ["#f59e0b", "#fbbf24", "#fcd34d", "#f97316"], // amber/gold
} as const;

type Mode = keyof typeof COLORS;

export function triggerCelebration(mode: Mode, scorePercent: number) {
  if (scorePercent < 80) return;

  const colors = COLORS[mode];
  const duration =
    scorePercent === 100 ? 3000 : scorePercent >= 90 ? 2000 : 1200;
  const particleCount = scorePercent === 100 ? 6 : scorePercent >= 90 ? 4 : 3;

  let rafId: number | null = null;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount,
      angle: 60 + Math.random() * 60,
      spread: 55,
      origin: { x: Math.random(), y: Math.random() * 0.4 },
      colors: [...colors],
    });
    if (Date.now() < end) rafId = requestAnimationFrame(frame);
  };
  frame();

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    confetti.reset();
  };
}
