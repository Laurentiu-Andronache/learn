import { vi } from "vitest";

/**
 * Creates a chainable mock that mimics Supabase's fluent query builder.
 * Every method call returns the same proxy, and awaiting resolves to finalResult.
 */
export function chainable(finalResult: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = (): unknown =>
    new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === "then") {
            return (resolve: (v: unknown) => void) => resolve(finalResult);
          }
          if (!chain[prop]) {
            chain[prop] = vi.fn(() => self());
          }
          return chain[prop];
        },
      },
    );
  return self();
}

/**
 * Creates a mock Supabase client with a `.from()` spy.
 * Usage: mockSupabase.from.mockReturnValue(chainable({ data: [...], error: null }))
 */
export function createMockSupabase() {
  return { from: vi.fn() };
}

/** Standard MCP text response helper for assertions */
export function extractText(result: { content: Array<{ type: string; text: string }> }): string {
  return result.content[0].text;
}

/** Parse JSON from MCP text response */
export function extractJson(result: { content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse(result.content[0].text);
}
