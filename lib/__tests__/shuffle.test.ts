import { describe, expect, it } from "vitest";
import { shuffleArray } from "@/lib/shuffle";

describe("shuffleArray", () => {
  it("returns array with same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(input.length);
    expect(result.sort()).toEqual(input.sort());
  });

  it("does not mutate the original array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffleArray(input);
    expect(input).toEqual(copy);
  });

  it("handles empty array", () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it("handles single element", () => {
    expect(shuffleArray([42])).toEqual([42]);
  });
});
