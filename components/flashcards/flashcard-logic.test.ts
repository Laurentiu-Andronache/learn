import { describe, expect, it } from "vitest";

// ─── Flashcard grading logic (mirrors advance() in flashcard-stack.tsx) ─────

type Rating = 1 | 2 | 3 | 4;

function gradeFlashcard(rating: Rating): { rating: Rating } {
  return { rating };
}

// ─── Flashcard stack advance logic ──────────────────────────────────────────

interface StackState {
  currentIndex: number;
  ratings: Map<string, Rating>;
  completed: boolean;
}

function advanceStack(
  state: StackState,
  flashcardId: string,
  rating: Rating,
  totalCards: number,
): StackState {
  const newRatings = new Map(state.ratings);
  newRatings.set(flashcardId, rating);

  if (state.currentIndex + 1 >= totalCards) {
    return {
      currentIndex: state.currentIndex,
      ratings: newRatings,
      completed: true,
    };
  }

  return {
    currentIndex: state.currentIndex + 1,
    ratings: newRatings,
    completed: false,
  };
}

// ─── Results computation (mirrors FlashcardSession results logic) ───────────

interface CategoryResult {
  name: string;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

interface FlashcardQuestion {
  id: string;
  categoryNameEn: string;
}

function computeCategoryResults(
  questions: FlashcardQuestion[],
  ratings: Map<string, Rating>,
): CategoryResult[] {
  const categoryMap = new Map<string, CategoryResult>();
  for (const q of questions) {
    if (!categoryMap.has(q.categoryNameEn)) {
      categoryMap.set(q.categoryNameEn, {
        name: q.categoryNameEn,
        again: 0,
        hard: 0,
        good: 0,
        easy: 0,
      });
    }
    const cat = categoryMap.get(q.categoryNameEn)!;
    const r = ratings.get(q.id);
    if (r === 1) cat.again++;
    else if (r === 2) cat.hard++;
    else if (r === 3) cat.good++;
    else if (r === 4) cat.easy++;
  }
  return Array.from(categoryMap.values());
}

function computeRecallPercent(ratings: Map<string, Rating>): number {
  const vals = [...ratings.values()];
  if (vals.length === 0) return 0;
  const goodEasy = vals.filter((r) => r === 3 || r === 4).length;
  return Math.round((goodEasy / vals.length) * 100);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("gradeFlashcard", () => {
  it("returns Again for rating 1", () => {
    expect(gradeFlashcard(1).rating).toBe(1);
  });

  it("returns Hard for rating 2", () => {
    expect(gradeFlashcard(2).rating).toBe(2);
  });

  it("returns Good for rating 3", () => {
    expect(gradeFlashcard(3).rating).toBe(3);
  });

  it("returns Easy for rating 4", () => {
    expect(gradeFlashcard(4).rating).toBe(4);
  });
});

describe("advanceStack", () => {
  const initial: StackState = {
    currentIndex: 0,
    ratings: new Map(),
    completed: false,
  };

  it("advances index on Good rating", () => {
    const next = advanceStack(initial, "q1", 3, 5);
    expect(next.currentIndex).toBe(1);
    expect(next.ratings.get("q1")).toBe(3);
    expect(next.completed).toBe(false);
  });

  it("advances index on Again rating", () => {
    const next = advanceStack(initial, "q1", 1, 5);
    expect(next.currentIndex).toBe(1);
    expect(next.ratings.get("q1")).toBe(1);
    expect(next.completed).toBe(false);
  });

  it("marks completed on last card", () => {
    const state: StackState = {
      currentIndex: 4,
      ratings: new Map([["q1", 3]]),
      completed: false,
    };
    const next = advanceStack(state, "q5", 4, 5);
    expect(next.completed).toBe(true);
    expect(next.ratings.get("q5")).toBe(4);
  });

  it("accumulates all 4 ratings through full deck", () => {
    let state = initial;
    const cards = ["q1", "q2", "q3", "q4", "q5"];
    const answers: Rating[] = [1, 2, 3, 4, 1];

    for (let i = 0; i < cards.length; i++) {
      state = advanceStack(state, cards[i], answers[i], cards.length);
    }

    expect(state.ratings.get("q1")).toBe(1);
    expect(state.ratings.get("q2")).toBe(2);
    expect(state.ratings.get("q3")).toBe(3);
    expect(state.ratings.get("q4")).toBe(4);
    expect(state.ratings.get("q5")).toBe(1);
    expect(state.completed).toBe(true);
  });

  it("handles single-card deck", () => {
    const next = advanceStack(initial, "q1", 3, 1);
    expect(next.completed).toBe(true);
    expect(next.ratings.get("q1")).toBe(3);
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

  it("groups results by category with 4-point breakdown", () => {
    const ratings = new Map<string, Rating>([
      ["q1", 1],
      ["q2", 3],
      ["q3", 2],
      ["q4", 4],
      ["q5", 3],
    ]);
    const results = computeCategoryResults(questions, ratings);
    expect(results).toHaveLength(3);

    const bio = results.find((r) => r.name === "Biology")!;
    expect(bio.again).toBe(1);
    expect(bio.good).toBe(1);

    const chem = results.find((r) => r.name === "Chemistry")!;
    expect(chem.hard).toBe(1);
    expect(chem.easy).toBe(1);

    const phys = results.find((r) => r.name === "Physics")!;
    expect(phys.good).toBe(1);
  });

  it("handles all Good ratings", () => {
    const ratings = new Map<string, Rating>([
      ["q1", 3],
      ["q2", 3],
      ["q3", 3],
      ["q4", 3],
      ["q5", 3],
    ]);
    const results = computeCategoryResults(questions, ratings);
    const totalGood = results.reduce((sum, r) => sum + r.good, 0);
    expect(totalGood).toBe(5);
  });

  it("handles empty questions", () => {
    const results = computeCategoryResults([], new Map());
    expect(results).toHaveLength(0);
  });
});

describe("computeRecallPercent", () => {
  it("computes (good + easy) / total * 100", () => {
    const ratings = new Map<string, Rating>([
      ["q1", 1],
      ["q2", 2],
      ["q3", 3],
      ["q4", 4],
    ]);
    // good + easy = 2, total = 4 → 50%
    expect(computeRecallPercent(ratings)).toBe(50);
  });

  it("returns 0 for empty ratings", () => {
    expect(computeRecallPercent(new Map())).toBe(0);
  });

  it("returns 100 when all Good/Easy", () => {
    const ratings = new Map<string, Rating>([
      ["q1", 3],
      ["q2", 4],
      ["q3", 3],
    ]);
    expect(computeRecallPercent(ratings)).toBe(100);
  });

  it("returns 0 when all Again/Hard", () => {
    const ratings = new Map<string, Rating>([
      ["q1", 1],
      ["q2", 2],
    ]);
    expect(computeRecallPercent(ratings)).toBe(0);
  });
});

describe("review Again flow", () => {
  it("filters flashcards to only those with rating===1", () => {
    const allCards = [
      { id: "q1", categoryNameEn: "A" },
      { id: "q2", categoryNameEn: "B" },
      { id: "q3", categoryNameEn: "A" },
    ];
    const ratings = new Map<string, Rating>([
      ["q1", 3],
      ["q2", 1],
      ["q3", 2],
    ]);

    const againIds = new Set(
      [...ratings.entries()].filter(([, r]) => r === 1).map(([id]) => id),
    );
    const filtered = allCards.filter((q) => againIds.has(q.id));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("q2");
  });
});
