import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type TypedClient, getSupabaseClient } from "../supabase.js";
import type { TablesInsert } from "../database.types.js";
import { type McpResult, ok, err } from "../utils.js";

// ─── Handlers ────────────────────────────────────────────────────────

export async function handleListQuestions(
  supabase: TypedClient,
  params: {
    topic_id?: string;
    category_id?: string;
    type?: string;
    difficulty_min?: number;
    difficulty_max?: number;
    search?: string;
    compact?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<McpResult> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const selectStr = params.compact
    ? "id, question_en, type, difficulty, correct_index, category_id, categories!inner(id, name_en, topic_id)"
    : "*, categories!inner(id, name_en, name_es, topic_id)";

  let query = supabase
    .from("questions")
    .select(selectStr, { count: "exact" });

  if (params.topic_id) {
    query = query.eq("categories.topic_id", params.topic_id);
  }
  if (params.category_id) {
    query = query.eq("category_id", params.category_id);
  }
  if (params.type) {
    query = query.eq("type", params.type);
  }
  if (params.difficulty_min !== undefined) {
    query = query.gte("difficulty", params.difficulty_min);
  }
  if (params.difficulty_max !== undefined) {
    query = query.lte("difficulty", params.difficulty_max);
  }
  if (params.search) {
    const terms = params.search.split(/\s+/).filter(Boolean);
    const fields = ["question_en", "question_es", "explanation_en", "explanation_es", "extra_en", "extra_es"];
    const orFilter = fields
      .flatMap((f) => terms.map((t) => `${f}.ilike.%${t}%`))
      .join(",");
    query = query.or(orFilter);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) return err(error.message);
  return ok({ questions: data ?? [], total: count ?? 0 });
}

export async function handleGetQuestion(
  supabase: TypedClient,
  params: { question_id: string }
): Promise<McpResult> {
  const { data, error } = await supabase
    .from("questions")
    .select("*, categories(id, name_en, name_es, topics(id, title_en, title_es))")
    .eq("id", params.question_id)
    .single();

  if (error) return err(error.message);
  if (!data) return err("Question not found");
  return ok(data);
}

export async function handleSearchQuestions(
  supabase: TypedClient,
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

  // Build ilike filters for search fields
  const searchFields = params.fields?.length
    ? params.fields
    : params.lang === "es"
      ? ["question_es", "explanation_es", "extra_es"]
      : params.lang === "en"
        ? ["question_en", "explanation_en", "extra_en"]
        : ["question_en", "question_es", "explanation_en", "explanation_es", "extra_en", "extra_es"];

  // Split multi-word query into individual terms for OR matching
  const terms = q.split(/\s+/).filter(Boolean);
  const orFilter = searchFields
    .flatMap((f) => terms.map((t) => `${f}.ilike.%${t}%`))
    .join(",");

  let query = supabase
    .from("questions")
    .select("*, categories!inner(id, name_en, topic_id)")
    .or(orFilter)
    .limit(limit);

  if (params.topic_id) {
    query = query.eq("categories.topic_id", params.topic_id);
  }

  const { data, error } = await query;

  if (error) return err(error.message);
  return ok(data ?? []);
}

export async function handleCreateQuestion(
  supabase: TypedClient,
  params: {
    category_id: string;
    type: string;
    question_en: string;
    question_es: string;
    options_en?: string[];
    options_es?: string[];
    correct_index?: number;
    explanation_en?: string;
    explanation_es?: string;
    extra_en?: string;
    extra_es?: string;
    difficulty?: number;
  }
): Promise<McpResult> {
  const row: Record<string, unknown> = {
    category_id: params.category_id,
    type: params.type,
    question_en: params.question_en,
    question_es: params.question_es,
  };
  if (params.options_en !== undefined) row.options_en = params.options_en;
  if (params.options_es !== undefined) row.options_es = params.options_es;
  if (params.correct_index !== undefined) row.correct_index = params.correct_index;
  if (params.explanation_en !== undefined) row.explanation_en = params.explanation_en;
  if (params.explanation_es !== undefined) row.explanation_es = params.explanation_es;
  if (params.extra_en !== undefined) row.extra_en = params.extra_en;
  if (params.extra_es !== undefined) row.extra_es = params.extra_es;
  if (params.difficulty !== undefined) row.difficulty = params.difficulty;

  const { data, error } = await supabase
    .from("questions")
    .insert(row as TablesInsert<"questions">)
    .select()
    .single();

  if (error) return err(error.message);
  console.error(`[audit] Created question ${data.id}`);
  return ok(data);
}

export async function handleCreateQuestionsBatch(
  supabase: TypedClient,
  params: {
    category_id: string;
    questions: Array<{
      type: string;
      question_en: string;
      question_es: string;
      options_en?: string[];
      options_es?: string[];
      correct_index?: number;
      explanation_en?: string;
      explanation_es?: string;
      extra_en?: string;
      extra_es?: string;
      difficulty?: number;
    }>;
  }
): Promise<McpResult> {
  if (!params.questions.length) return err("Questions array cannot be empty");

  const rows = params.questions.map((q) => ({
    category_id: params.category_id,
    ...q,
  }));

  const { data, error } = await supabase.from("questions").insert(rows as TablesInsert<"questions">[]).select();

  if (error) return err(error.message);
  console.error(`[audit] Batch created ${data.length} questions in category ${params.category_id}`);
  return ok(data);
}

export async function handleUpdateQuestion(
  supabase: TypedClient,
  params: {
    question_id: string;
    category_id?: string;
    type?: string;
    question_en?: string;
    question_es?: string;
    options_en?: string[];
    options_es?: string[];
    correct_index?: number;
    explanation_en?: string;
    explanation_es?: string;
    extra_en?: string;
    extra_es?: string;
    difficulty?: number;
  }
): Promise<McpResult> {
  const { question_id, ...fields } = params;
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) updates[k] = v;
  }
  if (!Object.keys(updates).length) return err("No fields to update");

  const { data, error } = await supabase
    .from("questions")
    .update(updates)
    .eq("id", question_id)
    .select()
    .single();

  if (error) return err(error.message);
  console.error(`[audit] Updated question ${question_id}`);
  return ok(data);
}

export async function handleUpdateQuestionsBatch(
  supabase: TypedClient,
  params: {
    updates: Array<{
      question_id: string;
      [key: string]: unknown;
    }>;
  }
): Promise<McpResult> {
  if (!params.updates.length) return err("Updates array cannot be empty");

  const results: { updated: number; errors: Array<{ question_id: string; error: string }> } = {
    updated: 0,
    errors: [],
  };

  for (const { question_id, ...fields } of params.updates) {
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

  console.error(`[audit] Batch updated ${results.updated} questions, ${results.errors.length} errors`);
  return ok(results);
}

export async function handleDeleteQuestion(
  supabase: TypedClient,
  params: { question_id: string }
): Promise<McpResult> {
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", params.question_id);

  if (error) return err(error.message);
  console.error(`[audit] Deleted question ${params.question_id}`);
  return ok(`Deleted question ${params.question_id}`);
}

export async function handleDeleteQuestionsBatch(
  supabase: TypedClient,
  params: { question_ids: string[]; confirm: string }
): Promise<McpResult> {
  if (params.confirm !== "DELETE ALL")
    return err('Confirm must be "DELETE ALL"');
  if (!params.question_ids.length) return err("Question IDs cannot be empty");

  const { error } = await supabase
    .from("questions")
    .delete()
    .in("id", params.question_ids);

  if (error) return err(error.message);
  console.error(`[audit] Batch deleted ${params.question_ids.length} questions`);
  return ok(`Deleted ${params.question_ids.length} questions`);
}

export async function handleMoveQuestions(
  supabase: TypedClient,
  params: { question_ids: string[]; new_category_id: string }
): Promise<McpResult> {
  if (!params.question_ids.length) return err("Question IDs cannot be empty");

  const { data, error } = await supabase
    .from("questions")
    .update({ category_id: params.new_category_id })
    .in("id", params.question_ids)
    .select();

  if (error) return err(error.message);
  console.error(
    `[audit] Moved ${params.question_ids.length} questions to category ${params.new_category_id}`
  );
  return ok(`Moved ${(data ?? []).length} questions to category ${params.new_category_id}`);
}

// ─── Registration ────────────────────────────────────────────────────

export function registerQuestionTools(server: McpServer): void {
  server.tool(
    "learn_list_questions",
    "List questions with optional filters (topic, category, type, difficulty, search). Returns paginated results.",
    {
      topic_id: z.string().uuid().optional().describe("Filter by topic UUID"),
      category_id: z.string().uuid().optional().describe("Filter by category UUID"),
      type: z.enum(["multiple_choice", "true_false"]).optional().describe("Question type"),
      difficulty_min: z.number().min(1).max(10).optional().describe("Min difficulty"),
      difficulty_max: z.number().min(1).max(10).optional().describe("Max difficulty"),
      search: z.string().optional().describe("Search in question text (multi-word splits into OR terms, searches all text fields)"),
      compact: z.boolean().optional().describe("Return only id, question_en, type, difficulty, correct_index (default false)"),
      limit: z.number().min(1).max(200).optional().describe("Results per page (default 50)"),
      offset: z.number().min(0).optional().describe("Offset for pagination"),
    },
    { readOnlyHint: true },
    async (params) => handleListQuestions(getSupabaseClient(), params)
  );

  server.tool(
    "learn_get_question",
    "Get a single question with its category and topic context.",
    {
      question_id: z.string().uuid().describe("Question UUID"),
    },
    { readOnlyHint: true },
    async (params) => handleGetQuestion(getSupabaseClient(), params)
  );

  server.tool(
    "learn_search_questions",
    "Search across question text, explanations, and extra content (case-insensitive substring match).",
    {
      query: z.string().describe("Search query"),
      lang: z.enum(["en", "es"]).optional().describe("Limit search to one language"),
      fields: z.array(z.string()).optional().describe("Specific fields to search"),
      topic_id: z.string().uuid().optional().describe("Filter by topic"),
      limit: z.number().min(1).max(100).optional().describe("Max results (default 20)"),
    },
    { readOnlyHint: true },
    async (params) => handleSearchQuestions(getSupabaseClient(), params)
  );

  server.tool(
    "learn_create_question",
    "Create a new question in a category.",
    {
      category_id: z.string().uuid().describe("Category UUID"),
      type: z.enum(["multiple_choice", "true_false"]).describe("Question type"),
      question_en: z.string().describe("Question text (English)"),
      question_es: z.string().describe("Question text (Spanish)"),
      options_en: z.array(z.string()).optional().describe("Answer options (English)"),
      options_es: z.array(z.string()).optional().describe("Answer options (Spanish)"),
      correct_index: z.number().optional().describe("Index of correct answer"),
      explanation_en: z.string().optional().describe("Explanation (English)"),
      explanation_es: z.string().optional().describe("Explanation (Spanish)"),
      extra_en: z.string().optional().describe("Extra info (English)"),
      extra_es: z.string().optional().describe("Extra info (Spanish)"),
      difficulty: z.number().min(1).max(10).optional().describe("Difficulty 1-10 (default 5)"),
    },
    async (params) => handleCreateQuestion(getSupabaseClient(), params)
  );

  server.tool(
    "learn_create_questions_batch",
    "Create multiple questions in a category at once.",
    {
      category_id: z.string().uuid().describe("Category UUID for all questions"),
      questions: z.array(
        z.object({
          type: z.enum(["multiple_choice", "true_false"]),
          question_en: z.string(),
          question_es: z.string(),
          options_en: z.array(z.string()).optional(),
          options_es: z.array(z.string()).optional(),
          correct_index: z.number().optional(),
          explanation_en: z.string().optional(),
          explanation_es: z.string().optional(),
          extra_en: z.string().optional(),
          extra_es: z.string().optional(),
          difficulty: z.number().min(1).max(10).optional(),
        })
      ).describe("Array of question objects"),
    },
    async (params) => handleCreateQuestionsBatch(getSupabaseClient(), params)
  );

  server.tool(
    "learn_update_question",
    "Update fields on a single question.",
    {
      question_id: z.string().uuid().describe("Question UUID"),
      category_id: z.string().uuid().optional().describe("New category"),
      type: z.enum(["multiple_choice", "true_false"]).optional(),
      question_en: z.string().optional(),
      question_es: z.string().optional(),
      options_en: z.array(z.string()).optional(),
      options_es: z.array(z.string()).optional(),
      correct_index: z.number().optional(),
      explanation_en: z.string().optional(),
      explanation_es: z.string().optional(),
      extra_en: z.string().optional(),
      extra_es: z.string().optional(),
      difficulty: z.number().min(1).max(10).optional(),
    },
    async (params) => handleUpdateQuestion(getSupabaseClient(), params)
  );

  server.tool(
    "learn_update_questions_batch",
    "Update multiple questions at once. Each update specifies a question_id and fields to change.",
    {
      updates: z.array(
        z.object({
          question_id: z.string().uuid(),
          category_id: z.string().uuid().optional(),
          type: z.enum(["multiple_choice", "true_false"]).optional(),
          question_en: z.string().optional(),
          question_es: z.string().optional(),
          options_en: z.array(z.string()).optional(),
          options_es: z.array(z.string()).optional(),
          correct_index: z.number().optional(),
          explanation_en: z.string().optional(),
          explanation_es: z.string().optional(),
          extra_en: z.string().optional(),
          extra_es: z.string().optional(),
          difficulty: z.number().min(1).max(10).optional(),
        })
      ).describe("Array of updates"),
    },
    async (params) => handleUpdateQuestionsBatch(getSupabaseClient(), params)
  );

  server.tool(
    "learn_delete_question",
    "Delete a single question.",
    {
      question_id: z.string().uuid().describe("Question UUID to delete"),
    },
    { destructiveHint: true },
    async (params) => handleDeleteQuestion(getSupabaseClient(), params)
  );

  server.tool(
    "learn_delete_questions_batch",
    'Batch delete questions. Requires confirm="DELETE ALL" for safety.',
    {
      question_ids: z.array(z.string().uuid()).describe("Question UUIDs to delete"),
      confirm: z.string().describe('Must be "DELETE ALL"'),
    },
    { destructiveHint: true },
    async (params) => handleDeleteQuestionsBatch(getSupabaseClient(), params)
  );

  server.tool(
    "learn_move_questions",
    "Move questions to a different category.",
    {
      question_ids: z.array(z.string().uuid()).describe("Question UUIDs to move"),
      new_category_id: z.string().uuid().describe("Target category UUID"),
    },
    async (params) => handleMoveQuestions(getSupabaseClient(), params)
  );
}
