import { describe, expect, test } from "vitest";
import { generatorParameters } from "ts-fsrs";

describe("FSRS-6 verification", () => {
  test("default parameters use FSRS-6 (21 weights)", () => {
    const params = generatorParameters({ enable_fuzz: true });
    expect(params.w.length).toBe(21);
    // FSRS6_DEFAULT_DECAY = 0.1542
    expect(params.w[20]).toBeCloseTo(0.1542, 3);
  });
});
