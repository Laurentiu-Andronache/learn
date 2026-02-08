"use server";

import { requireAdmin } from "@/lib/supabase/server";

type TranslatableFields = Record<string, string | string[] | null>;

interface TranslateParams {
  fields: TranslatableFields;
  sourceLang: "en" | "es";
  targetLang: "en" | "es";
}

type TranslateResult =
  | { data: TranslatableFields; error: null }
  | { data: null; error: string };

export async function translateFields({
  fields,
  sourceLang,
  targetLang,
}: TranslateParams): Promise<TranslateResult> {
  try {
    await requireAdmin();
  } catch {
    return { data: null, error: "Unauthorized" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { data: null, error: "ANTHROPIC_API_KEY not configured" };
  const model =
    process.env.ANTHROPIC_TRANSLATE_MODEL || "claude-3-5-haiku-20241022";

  // Filter out null/empty fields
  const toTranslate: TranslatableFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    toTranslate[key] = value;
  }

  if (Object.keys(toTranslate).length === 0) return { data: {}, error: null };

  const langNames = { en: "English", es: "Spanish" };
  const sourceName = langNames[sourceLang];
  const targetName = langNames[targetLang];

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: `You translate educational content for a health/cognitive science learning app.
Translate from ${sourceName} to ${targetName}.
Preserve all markdown formatting.
For arrays, maintain the same length and order.
Return ONLY valid JSON matching the exact input structure — no extra keys, no explanation.`,
        messages: [
          {
            role: "user",
            content: `Translate the following fields from ${sourceName} to ${targetName}:\n\n${JSON.stringify(toTranslate, null, 2)}`,
          },
        ],
      }),
    });
  } catch (err) {
    return {
      data: null,
      error: `Network error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  if (!res.ok) {
    const body = await res.text();
    // Extract just the message from the Anthropic error JSON if possible
    try {
      const parsed = JSON.parse(body);
      return {
        data: null,
        error: parsed?.error?.message ?? `API error ${res.status}`,
      };
    } catch {
      return { data: null, error: `API error ${res.status}` };
    }
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";

  // Parse JSON, handling possible code-block wrapping
  const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  let translated: TranslatableFields;
  try {
    translated = JSON.parse(jsonStr);
  } catch {
    return { data: null, error: "Failed to parse translation response" };
  }

  // Validate array lengths match
  for (const [key, value] of Object.entries(toTranslate)) {
    if (Array.isArray(value) && Array.isArray(translated[key])) {
      if (value.length !== (translated[key] as string[]).length) {
        delete translated[key]; // drop mismatched arrays
      }
    }
  }

  return { data: translated, error: null };
}
