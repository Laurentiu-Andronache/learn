import { describe, expect, it } from "vitest";

// ─── Flashcard grading logic (mirrors advance() in flashcard-stack.tsx) ─────

type Rating = 1 | 2 | 3 | 4;
const AGAIN = 1 as Rating;
const GOOD = 3 as Rating;

function gradeFlashcard(knew: boolean): { rating: Rating; wasCorrect: boolean } {
  return {
    rating: knew ? GOOD : AGAIN,
    wasCorrect: knew,
  };
}

// ─── Flashcard stack advance logic ──────────────────────────────────────────

interface StackState {
  currentIndex: number;
  knew: string[];
  didntKnow: string[];
  completed: boolean;
}

function advanceStack(
  state: StackState,
  questionId: string,
  knewIt: boolean,
  totalQuestions: number,
): StackState {
  const newKnew = knewIt ? [...state.knew, questionId] : state.knew;
  const newDidntKnow = knewIt ? state.didntKnow : [...state.didntKnow, questionId];

  if (state.currentIndex + 1 >= totalQuestions) {
    return {
      currentIndex: state.currentIndex,
      knew: newKnew,
      didntKnow: newDidntKnow,
      completed: true,
    };
  }

  return {
    currentIndex: state.currentIndex + 1,
    knew: newKnew,
    didntKnow: newDidntKnow,
    completed: false,
  };
}

// ─── Results computation (mirrors FlashcardSession results logic) ───────────

interface CategoryResult {
  name: string;
  knew: number;
  didntKnow: number;
}

interface FlashcardQuestion {
  id: string;
  categoryNameEn: string;
}

function computeCategoryResults(
  questions: FlashcardQuestion[],
  knew: string[],
  didntKnow: string[],
): CategoryResult[] {
  const categoryMap = new Map<string, CategoryResult>();
  for (const q of questions) {
    if (!categoryMap.has(q.categoryNameEn)) {
      categoryMap.set(q.categoryNameEn, { name: q.categoryNameEn, knew: 0, didntKnow: 0 });
    }
    const cat = categoryMap.get(q.categoryNameEn)!;
    if (knew.includes(q.id)) cat.knew++;
    else if (didntKnow.includes(q.id)) cat.didntKnow++;
  }
  return Array.from(categoryMap.values());
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("gradeFlashcard", () => {
  it("returns Good + true for knew", () => {
    const result = gradeFlashcard(true);
    expect(result.rating).toBe(GOOD);
    expect(result.wasCorrect).toBe(true);
  });

  it("returns Again + false for didn't know", () => {
    const result = gradeFlashcard(false);
    expect(result.rating).toBe(AGAIN);
    expect(result.wasCorrect).toBe(false);
  });
});

describe("advanceStack", () => {
  const initial: StackState = {
    currentIndex: 0,
    knew: [],
    didntKnow: [],
    completed: false,
  };

  it("advances index on knew", () => {
    const next = advanceStack(initial, "q1", true, 5);
    expect(next.currentIndex).toBe(1);
    expect(next.knew).toEqual(["q1"]);
    expect(next.didntKnow).toEqual([]);
    expect(next.completed).toBe(false);
  });

  it("advances index on didn't know", () => {
    const next = advanceStack(initial, "q1", false, 5);
    expect(next.currentIndex).toBe(1);
    expect(next.knew).toEqual([]);
    expect(next.didntKnow).toEqual(["q1"]);
    expect(next.completed).toBe(false);
  });

  it("marks completed on last question", () => {
    const state: StackState = { currentIndex: 4, knew: ["q1"], didntKnow: ["q2"], completed: false };
    const next = advanceStack(state, "q5", true, 5);
    expect(next.completed).toBe(true);
    expect(next.knew).toEqual(["q1", "q5"]);
  });

  it("accumulates results through full deck", () => {
    let state = initial;
    const questions = ["q1", "q2", "q3", "q4", "q5"];
    const answers = [true, false, true, true, false];

    for (let i = 0; i < questions.length; i++) {
      state = advanceStack(state, questions[i], answers[i], questions.length);
    }

    expect(state.knew).toEqual(["q1", "q3", "q4"]);
    expect(state.didntKnow).toEqual(["q2", "q5"]);
    expect(state.completed).toBe(true);
  });

  it("handles single-card deck", () => {
    const next = advanceStack(initial, "q1", true, 1);
    expect(next.completed).toBe(true);
    expect(next.knew).toEqual(["q1"]);
  });
});

describe("computeCategoryResults", () => {
  const questions: FlashcardQuestion[] = [
    { id: "q1", categoryNameEn: "Biology" },
    { id: "q2", categoryNameEn: "Biology" },
    { id: "q3", categoryNameEn: "Chemistry" },
    { id: "q4", categoryNameEn: "Chemistry" },
    { id: "q5", categoryNameEn: "Physics" },
  ];

  it("groups results by category", () => {
    const results = computeCategoryResults(
      questions,
      ["q1", "q3", "q5"],
      ["q2", "q4"],
    );
    expect(results).toHaveLength(3);

    const bio = results.find((r) => r.name === "Biology")!;
    expect(bio.knew).toBe(1);
    expect(bio.didntKnow).toBe(1);

    const chem = results.find((r) => r.name === "Chemistry")!;
    expect(chem.knew).toBe(1);
    expect(chem.didntKnow).toBe(1);

    const phys = results.find((r) => r.name === "Physics")!;
    expect(phys.knew).toBe(1);
    expect(phys.didntKnow).toBe(0);
  });

  it("handles all knew", () => {
    const results = computeCategoryResults(
      questions,
      ["q1", "q2", "q3", "q4", "q5"],
      [],
    );
    const total = results.reduce((sum, r) => sum + r.knew, 0);
    const totalDK = results.reduce((sum, r) => sum + r.didntKnow, 0);
    expect(total).toBe(5);
    expect(totalDK).toBe(0);
  });

  it("handles empty questions", () => {
    const results = computeCategoryResults([], [], []);
    expect(results).toHaveLength(0);
  });
});

describe("review didn't know flow", () => {
  it("filters questions to only those in didntKnow list", () => {
    const allQuestions = [
      { id: "q1", categoryNameEn: "A" },
      { id: "q2", categoryNameEn: "B" },
      { id: "q3", categoryNameEn: "A" },
    ];
    const didntKnow = ["q2"];

    // Simulates handleReviewDidntKnow from flashcard-session.tsx
    const filtered = allQuestions.filter((q) => didntKnow.includes(q.id));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("q2");
  });
});
