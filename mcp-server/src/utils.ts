export type McpResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export function ok(data: unknown): McpResult {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function err(msg: string): McpResult {
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}
