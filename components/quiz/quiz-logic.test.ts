import { describe, expect, it } from "vitest";
import { shuffleOptions } from "./quiz-card";

// ─── Quiz answer grading logic (mirrors handleNext in quiz-card.tsx) ────────

function gradeAnswer(
  selectedIndex: number | null,
  correctIndex: number,
): { wasCorrect: boolean | null } {
  if (selectedIndex === null) {
    return { wasCorrect: null }; // IDK
  }
  if (selectedIndex === correctIndex) {
    return { wasCorrect: true }; // Correct
  }
  return { wasCorrect: false }; // Wrong
}

// ─── QuizAnswer tracking logic (mirrors handleAnswer in quiz-session.tsx) ───

interface QuizAnswer {
  questionId: string;
  wasCorrect: boolean;
  wasIdk: boolean;
  selectedIndex: number | null;
  correctIndex: number;
  timeMs: number;
}

function buildQuizAnswer(
  questionId: string,
  wasCorrect: boolean | null,
  correctIndex: number,
  timeMs = 1000,
): QuizAnswer {
  return {
    questionId,
    wasCorrect: wasCorrect === true,
    wasIdk: wasCorrect === null,
    selectedIndex: wasCorrect === null ? null : wasCorrect ? correctIndex : -1,
    correctIndex,
    timeMs,
  };
}

function computeResults(answers: QuizAnswer[]) {
  const correct = answers.filter((a) => a.wasCorrect).length;
  const total = answers.length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const missed = answers.filter((a) => !a.wasCorrect);
  return { correct, total, percent, missed };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("shuffleOptions", () => {
  it("preserves all options after shuffle", () => {
    const opts = ["A", "B", "C", "D"];
    const result = shuffleOptions(opts, 2);
    expect(result.options).toHaveLength(4);
    expect(result.options.sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("tracks correct answer through shuffle", () => {
    const opts = ["Wrong1", "Wrong2", "Correct", "Wrong3"];
    const correctIdx = 2;
    for (let trial = 0; trial < 20; trial++) {
      const result = shuffleOptions(opts, correctIdx);
      expect(result.options[result.correctIndex]).toBe("Correct");
    }
  });

  it("handles 2-option arrays (true/false)", () => {
    const opts = ["True", "False"];
    const result = shuffleOptions(opts, 0);
    expect(result.options).toHaveLength(2);
    expect(result.options[result.correctIndex]).toBe("True");
  });

  it("handles single option", () => {
    const opts = ["Only"];
    const result = shuffleOptions(opts, 0);
    expect(result.options).toEqual(["Only"]);
    expect(result.correctIndex).toBe(0);
  });

  it("does not mutate the original array", () => {
    const opts = ["A", "B", "C", "D"];
    const original = [...opts];
    shuffleOptions(opts, 0);
    expect(opts).toEqual(original);
  });
});

describe("gradeAnswer", () => {
  it("returns null for IDK (selectedIndex = null)", () => {
    const result = gradeAnswer(null, 2);
    expect(result.wasCorrect).toBeNull();
  });

  it("returns true for correct answer", () => {
    const result = gradeAnswer(2, 2);
    expect(result.wasCorrect).toBe(true);
  });

  it("returns false for wrong answer", () => {
    const result = gradeAnswer(0, 2);
    expect(result.wasCorrect).toBe(false);
  });
});

describe("buildQuizAnswer", () => {
  it("builds correct answer entry", () => {
    const a = buildQuizAnswer("q1", true, 2);
    expect(a.wasCorrect).toBe(true);
    expect(a.wasIdk).toBe(false);
    expect(a.selectedIndex).toBe(2);
    expect(a.timeMs).toBe(1000);
  });

  it("builds incorrect answer entry", () => {
    const a = buildQuizAnswer("q2", false, 2);
    expect(a.wasCorrect).toBe(false);
    expect(a.wasIdk).toBe(false);
    expect(a.selectedIndex).toBe(-1);
  });

  it("builds IDK answer entry", () => {
    const a = buildQuizAnswer("q3", null, 2);
    expect(a.wasCorrect).toBe(false);
    expect(a.wasIdk).toBe(true);
    expect(a.selectedIndex).toBeNull();
  });

  it("records answer time", () => {
    const a = buildQuizAnswer("q4", true, 0, 5432);
    expect(a.timeMs).toBe(5432);
  });
});

describe("computeResults", () => {
  it("computes 100% for all correct", () => {
    const answers: QuizAnswer[] = [
      buildQuizAnswer("q1", true, 0),
      buildQuizAnswer("q2", true, 1),
      buildQuizAnswer("q3", true, 2),
    ];
    const r = computeResults(answers);
    expect(r.correct).toBe(3);
    expect(r.total).toBe(3);
    expect(r.percent).toBe(100);
    expect(r.missed).toHaveLength(0);
  });

  it("computes 0% for all wrong", () => {
    const answers: QuizAnswer[] = [
      buildQuizAnswer("q1", false, 0),
      buildQuizAnswer("q2", false, 1),
    ];
    const r = computeResults(answers);
    expect(r.correct).toBe(0);
    expect(r.percent).toBe(0);
    expect(r.missed).toHaveLength(2);
  });

  it("counts IDK as incorrect", () => {
    const answers: QuizAnswer[] = [
      buildQuizAnswer("q1", true, 0),
      buildQuizAnswer("q2", null, 1),
    ];
    const r = computeResults(answers);
    expect(r.correct).toBe(1);
    expect(r.percent).toBe(50);
    expect(r.missed).toHaveLength(1);
    expect(r.missed[0].questionId).toBe("q2");
  });

  it("handles empty answers", () => {
    const r = computeResults([]);
    expect(r.correct).toBe(0);
    expect(r.total).toBe(0);
    expect(r.percent).toBe(0);
  });

  it("rounds percentage correctly", () => {
    const answers: QuizAnswer[] = [
      buildQuizAnswer("q1", true, 0),
      buildQuizAnswer("q2", true, 1),
      buildQuizAnswer("q3", false, 2),
    ];
    const r = computeResults(answers);
    expect(r.percent).toBe(67); // 2/3 = 66.67 → rounds to 67
  });
});

describe("retry failed flow", () => {
  it("filters only failed questions for retry", () => {
    const answers: QuizAnswer[] = [
      buildQuizAnswer("q1", true, 0),
      buildQuizAnswer("q2", false, 1),
      buildQuizAnswer("q3", null, 2),
      buildQuizAnswer("q4", true, 0),
    ];

    // Simulates handleRetryFailed logic from quiz-session.tsx
    const missedIds = new Set(
      answers.filter((a) => !a.wasCorrect).map((a) => a.questionId),
    );

    expect(missedIds.size).toBe(2);
    expect(missedIds.has("q2")).toBe(true);
    expect(missedIds.has("q3")).toBe(true);
    expect(missedIds.has("q1")).toBe(false);
    expect(missedIds.has("q4")).toBe(false);
  });
});
