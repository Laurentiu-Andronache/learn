import type { TypedClient } from "../../supabase.js";
import { type McpResult, ok, err } from "../../utils.js";
import { validateTranslationFields, FLASHCARD_TRANSLATION_FIELDS } from "./check.js";

export async function handleUpdateTranslation(
  supabase: TypedClient,
  params: { question_id: string; fields: Record<string, unknown> }
): Promise<McpResult> {
  const validationErr = validateTranslationFields(params.fields);
  if (validationErr) return err(validationErr);

  const { data, error } = await supabase
    .from("questions")
    .update(params.fields)
    .eq("id", params.question_id)
    .select()
    .single();

  if (error) return err(error.message);
  console.error(`[audit] Updated translation for question ${params.question_id}`);
  return ok(data);
}

export async function handleBatchUpdateTranslations(
  supabase: TypedClient,
  params: { updates: Array<{ question_id: string; fields: Record<string, unknown> }> }
): Promise<McpResult> {
  if (!params.updates.length) return err("Updates array cannot be empty");

  // Validate all fields upfront
  for (const u of params.updates) {
    const validationErr = validateTranslationFields(u.fields);
    if (validationErr) return err(`Question ${u.question_id}: ${validationErr}`);
  }

  const results = { updated: 0, errors: [] as Array<{ question_id: string; error: string }> };

  for (const { question_id, fields } of params.updates) {
    const { error } = await supabase
      .from("questions")
      .update(fields)
      .eq("id", question_id)
      .select()
      .single();

    if (error) {
      results.errors.push({ question_id, error: error.message });
    } else {
      results.updated++;
    }
  }

  console.error(`[audit] Batch translation update: ${results.updated} updated, ${results.errors.length} errors`);
  return ok(results);
}

export async function handleUpdateFlashcardTranslation(
  supabase: TypedClient,
  params: { flashcard_id: string; fields: Record<string, unknown> }
): Promise<McpResult> {
  const validationErr = validateTranslationFields(params.fields, FLASHCARD_TRANSLATION_FIELDS);
  if (validationErr) return err(validationErr);

  const { data, error } = await supabase
    .from("flashcards")
    .update(params.fields)
    .eq("id", params.flashcard_id)
    .select()
    .single();

  if (error) return err(error.message);
  console.error(`[audit] Updated translation for flashcard ${params.flashcard_id}`);
  return ok(data);
}

export async function handleBatchUpdateFlashcardTranslations(
  supabase: TypedClient,
  params: { updates: Array<{ flashcard_id: string; fields: Record<string, unknown> }> }
): Promise<McpResult> {
  if (!params.updates.length) return err("Updates array cannot be empty");

  for (const u of params.updates) {
    const validationErr = validateTranslationFields(u.fields, FLASHCARD_TRANSLATION_FIELDS);
    if (validationErr) return err(`Flashcard ${u.flashcard_id}: ${validationErr}`);
  }

  const results = { updated: 0, errors: [] as Array<{ flashcard_id: string; error: string }> };

  for (const { flashcard_id, fields } of params.updates) {
    const { error } = await supabase
      .from("flashcards")
      .update(fields)
      .eq("id", flashcard_id)
      .select()
      .single();

    if (error) {
      results.errors.push({ flashcard_id, error: error.message });
    } else {
      results.updated++;
    }
  }

  console.error(`[audit] Batch flashcard translation update: ${results.updated} updated, ${results.errors.length} errors`);
  return ok(results);
}
