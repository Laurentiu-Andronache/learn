import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseClient } from "../supabase.js";

type McpResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function ok(data: unknown): McpResult {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(msg: string): McpResult {
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

// ─── Handlers ────────────────────────────────────────────────────────

export async function handleListFlashcards(
  supabase: SupabaseClient,
  params: {
    topic_id?: string;
    category_id?: string;
    difficulty_min?: number;
    difficulty_max?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<McpResult> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("flashcards")
    .select("*, categories!inner(id, name_en, name_es, theme_id)", { count: "exact" });

  if (params.topic_id) {
    query = query.eq("categories.theme_id", params.topic_id);
  }
  if (params.category_id) {
    query = query.eq("category_id", params.category_id);
  }
  if (params.difficulty_min !== undefined) {
    query = query.gte("difficulty", params.difficulty_min);
  }
  if (params.difficulty_max !== undefined) {
    query = query.lte("difficulty", params.difficulty_max);
  }
  if (params.search) {
    query = query.or(
      `question_en.ilike.%${params.search}%,question_es.ilike.%${params.search}%`
    );
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) return err(error.message);
  return ok({ flashcards: data ?? [], total: count ?? 0 });
}

export async function handleGetFlashcard(
  supabase: SupabaseClient,
  params: { flashcard_id: string }
): Promise<McpResult> {
  const { data, error } = await supabase
    .from("flashcards")
    .select("*, categories(id, name_en, name_es, themes(id, title_en, title_es))")
    .eq("id", params.flashcard_id)
    .single();

  if (error) return err(error.message);
  if (!data) return err("Flashcard not found");
  return ok(data);
}

export async function handleSearchFlashcards(
  supabase: SupabaseClient,
  params: {
    query: string;
    lang?: string;
    fields?: string[];
    topic_id?: string;
    limit?: number;
  }
): Promise<McpResult> {
  const limit = params.limit ?? 20;
  const q = params.query;

  const searchFields = params.fields?.length
    ? params.fields
    : params.lang === "es"
      ? ["question_es", "answer_es", "extra_es"]
      : params.lang === "en"
        ? ["question_en", "answer_en", "extra_en"]
        : ["question_en", "question_es", "answer_en", "answer_es", "extra_en", "extra_es"];

  const orFilter = searchFields.map((f) => `${f}.ilike.%${q}%`).join(",");

  let query = supabase
    .from("flashcards")
    .select("*, categories!inner(id, name_en, theme_id)")
    .or(orFilter)
    .limit(limit);

  if (params.topic_id) {
    query = query.eq("categories.theme_id", params.topic_id);
  }

  const { data, error } = await query;

  if (error) return err(error.message);
  return ok(data ?? []);
}

export async function handleCreateFlashcard(
  supabase: SupabaseClient,
  params: {
    category_id: string;
    question_en: string;
    question_es: string;
    answer_en: string;
    answer_es: string;
    extra_en?: string;
    extra_es?: string;
    difficulty?: number;
  }
): Promise<McpResult> {
  const row: Record<string, unknown> = {
    category_id: params.category_id,
    question_en: params.question_en,
    question_es: params.question_es,
    answer_en: params.answer_en,
    answer_es: params.answer_es,
  };
  if (params.extra_en !== undefined) row.extra_en = params.extra_en;
  if (params.extra_es !== undefined) row.extra_es = params.extra_es;
  if (params.difficulty !== undefined) row.difficulty = params.difficulty;

  const { data, error } = await supabase
    .from("flashcards")
    .insert(row)
    .select()
    .single();

  if (error) return err(error.message);
  console.error(`[audit] Created flashcard ${data.id}`);
  return ok(data);
}

export async function handleCreateFlashcardsBatch(
  supabase: SupabaseClient,
  params: {
    category_id: string;
    flashcards: Array<{
      question_en: string;
      question_es: string;
      answer_en: string;
      answer_es: string;
      extra_en?: string;
      extra_es?: string;
      difficulty?: number;
    }>;
  }
): Promise<McpResult> {
  if (!params.flashcards.length) return err("Flashcards array cannot be empty");

  const rows = params.flashcards.map((f) => ({
    category_id: params.category_id,
    ...f,
  }));

  const { data, error } = await supabase.from("flashcards").insert(rows).select();

  if (error) return err(error.message);
  console.error(`[audit] Batch created ${data.length} flashcards in category ${params.category_id}`);
  return ok(data);
}

export async function handleUpdateFlashcard(
  supabase: SupabaseClient,
  params: {
    flashcard_id: string;
    category_id?: string;
    question_en?: string;
    question_es?: string;
    answer_en?: string;
    answer_es?: string;
    extra_en?: string;
    extra_es?: string;
    difficulty?: number;
  }
): Promise<McpResult> {
  const { flashcard_id, ...fields } = params;
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) updates[k] = v;
  }
  if (!Object.keys(updates).length) return err("No fields to update");

  const { data, error } = await supabase
    .from("flashcards")
    .update(updates)
    .eq("id", flashcard_id)
    .select()
    .single();

  if (error) return err(error.message);
  console.error(`[audit] Updated flashcard ${flashcard_id}`);
  return ok(data);
}

export async function handleUpdateFlashcardsBatch(
  supabase: SupabaseClient,
  params: {
    updates: Array<{
      flashcard_id: string;
      [key: string]: unknown;
    }>;
  }
): Promise<McpResult> {
  if (!params.updates.length) return err("Updates array cannot be empty");

  const results: { updated: number; errors: Array<{ flashcard_id: string; error: string }> } = {
    updated: 0,
    errors: [],
  };

  for (const { flashcard_id, ...fields } of params.updates) {
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

  console.error(`[audit] Batch updated ${results.updated} flashcards, ${results.errors.length} errors`);
  return ok(results);
}

export async function handleDeleteFlashcard(
  supabase: SupabaseClient,
  params: { flashcard_id: string }
): Promise<McpResult> {
  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", params.flashcard_id);

  if (error) return err(error.message);
  console.error(`[audit] Deleted flashcard ${params.flashcard_id}`);
  return ok(`Deleted flashcard ${params.flashcard_id}`);
}

export async function handleDeleteFlashcardsBatch(
  supabase: SupabaseClient,
  params: { flashcard_ids: string[]; confirm: string }
): Promise<McpResult> {
  if (params.confirm !== "DELETE ALL")
    return err('Confirm must be "DELETE ALL"');
  if (!params.flashcard_ids.length) return err("Flashcard IDs cannot be empty");

  const { error } = await supabase
    .from("flashcards")
    .delete()
    .in("id", params.flashcard_ids);

  if (error) return err(error.message);
  console.error(`[audit] Batch deleted ${params.flashcard_ids.length} flashcards`);
  return ok(`Deleted ${params.flashcard_ids.length} flashcards`);
}

export async function handleMoveFlashcards(
  supabase: SupabaseClient,
  params: { flashcard_ids: string[]; new_category_id: string }
): Promise<McpResult> {
  if (!params.flashcard_ids.length) return err("Flashcard IDs cannot be empty");

  const { data, error } = await supabase
    .from("flashcards")
    .update({ category_id: params.new_category_id })
    .in("id", params.flashcard_ids)
    .select();

  if (error) return err(error.message);
  console.error(
    `[audit] Moved ${params.flashcard_ids.length} flashcards to category ${params.new_category_id}`
  );
  return ok(`Moved ${(data ?? []).length} flashcards to category ${params.new_category_id}`);
}

// ─── Registration ────────────────────────────────────────────────────

export function registerFlashcardTools(server: McpServer): void {
  server.tool(
    "learn_list_flashcards",
    "List flashcards with optional filters (topic, category, difficulty, search). Returns paginated results.",
    {
      topic_id: z.string().uuid().optional().describe("Filter by topic (theme) UUID"),
      category_id: z.string().uuid().optional().describe("Filter by category UUID"),
      difficulty_min: z.number().min(1).max(10).optional().describe("Min difficulty"),
      difficulty_max: z.number().min(1).max(10).optional().describe("Max difficulty"),
      search: z.string().optional().describe("Search in question text"),
      limit: z.number().min(1).max(200).optional().describe("Results per page (default 50)"),
      offset: z.number().min(0).optional().describe("Offset for pagination"),
    },
    async (params) => handleListFlashcards(getSupabaseClient(), params)
  );

  server.tool(
    "learn_get_flashcard",
    "Get a single flashcard with its category and topic context.",
    {
      flashcard_id: z.string().uuid().describe("Flashcard UUID"),
    },
    async (params) => handleGetFlashcard(getSupabaseClient(), params)
  );

  server.tool(
    "learn_search_flashcards",
    "Full-text search across flashcard question, answer, and extra content.",
    {
      query: z.string().describe("Search query"),
      lang: z.enum(["en", "es"]).optional().describe("Limit search to one language"),
      fields: z.array(z.string()).optional().describe("Specific fields to search"),
      topic_id: z.string().uuid().optional().describe("Filter by topic"),
      limit: z.number().min(1).max(100).optional().describe("Max results (default 20)"),
    },
    async (params) => handleSearchFlashcards(getSupabaseClient(), params)
  );

  server.tool(
    "learn_create_flashcard",
    "Create a new flashcard in a category.",
    {
      category_id: z.string().uuid().describe("Category UUID"),
      question_en: z.string().describe("Question text (English)"),
      question_es: z.string().describe("Question text (Spanish)"),
      answer_en: z.string().describe("Answer text (English)"),
      answer_es: z.string().describe("Answer text (Spanish)"),
      extra_en: z.string().optional().describe("Extra info (English)"),
      extra_es: z.string().optional().describe("Extra info (Spanish)"),
      difficulty: z.number().min(1).max(10).optional().describe("Difficulty 1-10 (default 5)"),
    },
    async (params) => handleCreateFlashcard(getSupabaseClient(), params)
  );

  server.tool(
    "learn_create_flashcards_batch",
    "Create multiple flashcards in a category at once.",
    {
      category_id: z.string().uuid().describe("Category UUID for all flashcards"),
      flashcards: z.array(
        z.object({
          question_en: z.string(),
          question_es: z.string(),
          answer_en: z.string(),
          answer_es: z.string(),
          extra_en: z.string().optional(),
          extra_es: z.string().optional(),
          difficulty: z.number().min(1).max(10).optional(),
        })
      ).describe("Array of flashcard objects"),
    },
    async (params) => handleCreateFlashcardsBatch(getSupabaseClient(), params)
  );

  server.tool(
    "learn_update_flashcard",
    "Update fields on a single flashcard.",
    {
      flashcard_id: z.string().uuid().describe("Flashcard UUID"),
      category_id: z.string().uuid().optional().describe("New category"),
      question_en: z.string().optional(),
      question_es: z.string().optional(),
      answer_en: z.string().optional(),
      answer_es: z.string().optional(),
      extra_en: z.string().optional(),
      extra_es: z.string().optional(),
      difficulty: z.number().min(1).max(10).optional(),
    },
    async (params) => handleUpdateFlashcard(getSupabaseClient(), params)
  );

  server.tool(
    "learn_update_flashcards_batch",
    "Update multiple flashcards at once. Each update specifies a flashcard_id and fields to change.",
    {
      updates: z.array(
        z.object({
          flashcard_id: z.string().uuid(),
          category_id: z.string().uuid().optional(),
          question_en: z.string().optional(),
          question_es: z.string().optional(),
          answer_en: z.string().optional(),
          answer_es: z.string().optional(),
          extra_en: z.string().optional(),
          extra_es: z.string().optional(),
          difficulty: z.number().min(1).max(10).optional(),
        })
      ).describe("Array of updates"),
    },
    async (params) => handleUpdateFlashcardsBatch(getSupabaseClient(), params)
  );

  server.tool(
    "learn_delete_flashcard",
    "Delete a single flashcard.",
    {
      flashcard_id: z.string().uuid().describe("Flashcard UUID to delete"),
    },
    async (params) => handleDeleteFlashcard(getSupabaseClient(), params)
  );

  server.tool(
    "learn_delete_flashcards_batch",
    'Batch delete flashcards. Requires confirm="DELETE ALL" for safety.',
    {
      flashcard_ids: z.array(z.string().uuid()).describe("Flashcard UUIDs to delete"),
      confirm: z.string().describe('Must be "DELETE ALL"'),
    },
    async (params) => handleDeleteFlashcardsBatch(getSupabaseClient(), params)
  );

  server.tool(
    "learn_move_flashcards",
    "Move flashcards to a different category.",
    {
      flashcard_ids: z.array(z.string().uuid()).describe("Flashcard UUIDs to move"),
      new_category_id: z.string().uuid().describe("Target category UUID"),
    },
    async (params) => handleMoveFlashcards(getSupabaseClient(), params)
  );
}
