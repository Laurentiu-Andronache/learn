export interface AnthropicCallOptions {
  apiKey: string;
  model: string;
  system: string;
  userContent: string;
  maxTokens: number;
}

export async function callAnthropicAPI(
  opts: AnthropicCallOptions,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.userContent }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}`);

  const data = await res.json();
  return (data.content?.[0]?.text ?? "").trim();
}

/** Strip markdown code-fence wrapping (```json ... ```) from LLM output. */
export function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
}
