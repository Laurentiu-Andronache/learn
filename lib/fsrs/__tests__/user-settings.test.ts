import { beforeEach, describe, expect, it, vi } from "vitest";

let mockSelectResult: { data: unknown; error: unknown };
let mockUpdateResult: { error: unknown };
let lastUpdateArgs: unknown;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      from: (_table: string) => {
        const chain = {
          select: () => chain,
          eq: () => chain,
          update: (args: unknown) => {
            lastUpdateArgs = args;
            return chain;
          },
          single: () => Promise.resolve(mockSelectResult),
          // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for await support
          then: (resolve: (v: unknown) => void) =>
            Promise.resolve(mockUpdateResult ?? mockSelectResult).then(
              resolve,
            ),
        };
        return chain;
      },
    }),
}));

const { getFsrsSettings, updateFsrsSettings } = await import(
  "@/lib/services/user-preferences"
);

describe("getFsrsSettings", () => {
  beforeEach(() => {
    mockSelectResult = { data: null, error: null };
    mockUpdateResult = { error: null };
    lastUpdateArgs = undefined;
  });

  it("returns exact values when all set", async () => {
    mockSelectResult = {
      data: {
        desired_retention: 0.85,
        max_review_interval: 180,
        new_cards_per_day: 10,
        show_review_time: false,
      },
      error: null,
    };

    const result = await getFsrsSettings("user-1");
    expect(result).toEqual({
      desired_retention: 0.85,
      max_review_interval: 180,
      new_cards_per_day: 10,
      show_review_time: false,
    });
  });

  it("returns defaults when profile has null columns", async () => {
    mockSelectResult = {
      data: {
        desired_retention: null,
        max_review_interval: null,
        new_cards_per_day: null,
        show_review_time: null,
      },
      error: null,
    };

    const result = await getFsrsSettings("user-1");
    expect(result).toEqual({
      desired_retention: 0.9,
      max_review_interval: 36500,
      new_cards_per_day: 20,
      show_review_time: true,
    });
  });

  it("returns defaults when profile not found (error)", async () => {
    mockSelectResult = {
      data: null,
      error: { message: "not found" },
    };

    const result = await getFsrsSettings("user-1");
    expect(result).toEqual({
      desired_retention: 0.9,
      max_review_interval: 36500,
      new_cards_per_day: 20,
      show_review_time: true,
    });
  });
});

describe("updateFsrsSettings", () => {
  beforeEach(() => {
    mockSelectResult = { data: null, error: null };
    mockUpdateResult = { error: null };
    lastUpdateArgs = undefined;
  });

  it("calls update with the provided fields", async () => {
    mockUpdateResult = { error: null };

    await updateFsrsSettings("user-1", {
      desired_retention: 0.85,
      max_review_interval: 180,
    });

    expect(lastUpdateArgs).toMatchObject({
      desired_retention: 0.85,
      max_review_interval: 180,
    });
  });

  it("throws on Supabase error", async () => {
    mockUpdateResult = { error: { message: "update failed" } };

    await expect(
      updateFsrsSettings("user-1", { desired_retention: 0.8 }),
    ).rejects.toThrow("update failed");
  });
});
