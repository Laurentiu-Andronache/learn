"use server";

import { env } from "@/lib/env";
import { callAnthropicAPI, stripCodeFences } from "@/lib/services/anthropic";
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

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return { data: null, error: "ANTHROPIC_API_KEY not configured" };
  const model = env.ANTHROPIC_TRANSLATE_MODEL;

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

  let text: string;
  try {
    text = await callAnthropicAPI({
      apiKey,
      model,
      maxTokens: 4096,
      system: `You translate educational content for a health/cognitive science learning app.
Translate from ${sourceName} to ${targetName}.
Preserve all markdown formatting.
For arrays, maintain the same length and order.
Return ONLY valid JSON matching the exact input structure — no extra keys, no explanation.`,
      userContent: `Translate the following fields from ${sourceName} to ${targetName}:\n\n${JSON.stringify(toTranslate, null, 2)}`,
    });
  } catch (err) {
    return {
      data: null,
      error: `API error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  let translated: TranslatableFields;
  try {
    translated = JSON.parse(stripCodeFences(text));
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
