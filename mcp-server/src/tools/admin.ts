import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type TypedClient, getSupabaseClient } from "../supabase.js";
import { type McpResult, ok, err } from "../utils.js";
import type { Database } from "../database.types.js";

// ─── Schema definitions (hardcoded reference) ──────────────────────
const SCHEMA: Record<string, Array<{ name: string; type: string; nullable?: boolean; note?: string }>> = {
  topics: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "title_en", type: "text" },
    { name: "title_es", type: "text" },
    { name: "description_en", type: "text", nullable: true },
    { name: "description_es", type: "text", nullable: true },
    { name: "icon", type: "text", nullable: true },
    { name: "color", type: "text", nullable: true },
    { name: "creator_id", type: "uuid", nullable: true, note: "FK→auth.users" },
    { name: "intro_text_en", type: "text", nullable: true },
    { name: "intro_text_es", type: "text", nullable: true },
    { name: "is_active", type: "boolean" },
    { name: "created_at", type: "timestamptz" },
    { name: "updated_at", type: "timestamptz" },
  ],
  categories: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "topic_id", type: "uuid", note: "FK→topics" },
    { name: "name_en", type: "text" },
    { name: "name_es", type: "text" },
    { name: "slug", type: "text" },
    { name: "color", type: "text", nullable: true },
    { name: "created_at", type: "timestamptz" },
  ],
  questions: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "category_id", type: "uuid", note: "FK→categories" },
    { name: "type", type: "text", note: "'multiple_choice'|'true_false'" },
    { name: "question_en", type: "text" },
    { name: "question_es", type: "text" },
    { name: "options_en", type: "jsonb", nullable: true },
    { name: "options_es", type: "jsonb", nullable: true },
    { name: "correct_index", type: "integer", nullable: true },
    { name: "explanation_en", type: "text", nullable: true },
    { name: "explanation_es", type: "text", nullable: true },
    { name: "extra_en", type: "text", nullable: true },
    { name: "extra_es", type: "text", nullable: true },
    { name: "difficulty", type: "integer", note: "1-10" },
    { name: "created_at", type: "timestamptz" },
    { name: "updated_at", type: "timestamptz" },
  ],
  flashcards: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "category_id", type: "uuid", note: "FK→categories" },
    { name: "question_en", type: "text" },
    { name: "question_es", type: "text" },
    { name: "answer_en", type: "text" },
    { name: "answer_es", type: "text" },
    { name: "extra_en", type: "text", nullable: true },
    { name: "extra_es", type: "text", nullable: true },
    { name: "difficulty", type: "integer", note: "1-10" },
    { name: "created_at", type: "timestamptz" },
    { name: "updated_at", type: "timestamptz" },
  ],
  profiles: [
    { name: "id", type: "uuid", note: "PK FK→auth.users" },
    { name: "display_name", type: "text", nullable: true },
    { name: "preferred_language", type: "text", note: "'en'|'es'" },
    { name: "is_anonymous", type: "boolean" },
    { name: "created_at", type: "timestamptz" },
    { name: "updated_at", type: "timestamptz" },
  ],
  admin_users: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "user_id", type: "uuid", note: "FK→auth.users, UNIQUE" },
    { name: "email", type: "text", note: "UNIQUE" },
    { name: "granted_by", type: "uuid", nullable: true },
    { name: "granted_at", type: "timestamptz" },
  ],
  user_card_state: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "user_id", type: "uuid" },
    { name: "flashcard_id", type: "uuid", note: "FK→flashcards" },
    { name: "stability", type: "float" },
    { name: "difficulty", type: "float" },
    { name: "elapsed_days", type: "float" },
    { name: "scheduled_days", type: "float" },
    { name: "reps", type: "integer" },
    { name: "lapses", type: "integer" },
    { name: "state", type: "text", note: "'new'|'learning'|'review'|'relearning'" },
    { name: "last_review", type: "timestamptz", nullable: true },
    { name: "due", type: "timestamptz" },
    { name: "times_correct", type: "integer" },
    { name: "times_incorrect", type: "integer" },
    { name: "times_idk", type: "integer" },
    { name: "created_at", type: "timestamptz" },
    { name: "updated_at", type: "timestamptz" },
  ],
  review_logs: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "user_id", type: "uuid" },
    { name: "flashcard_id", type: "uuid", note: "FK→flashcards" },
    { name: "card_state_id", type: "uuid" },
    { name: "rating", type: "integer", note: "1-4" },
    { name: "answer_time_ms", type: "integer", nullable: true },
    { name: "was_correct", type: "boolean", nullable: true },
    { name: "stability_before", type: "float", nullable: true },
    { name: "difficulty_before", type: "float", nullable: true },
    { name: "reviewed_at", type: "timestamptz" },
  ],
  quiz_attempts: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "user_id", type: "uuid" },
    { name: "topic_id", type: "uuid", note: "FK→topics" },
    { name: "score", type: "integer" },
    { name: "total", type: "integer" },
    { name: "answers", type: "jsonb" },
    { name: "created_at", type: "timestamptz" },
  ],
  feedback: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "user_id", type: "uuid", nullable: true },
    { name: "type", type: "text", note: "'bug'|'feature'|'content'|'other'" },
    { name: "message", type: "text" },
    { name: "url", type: "text", nullable: true },
    { name: "user_agent", type: "text", nullable: true },
    { name: "flashcard_id", type: "uuid", nullable: true, note: "FK→flashcards" },
    { name: "name", type: "text", nullable: true },
    { name: "email", type: "text", nullable: true },
    { name: "created_at", type: "timestamptz" },
  ],
  question_reports: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "question_id", type: "uuid" },
    { name: "user_id", type: "uuid", nullable: true },
    { name: "issue_type", type: "text" },
    { name: "description", type: "text" },
    { name: "status", type: "text", note: "'pending'|'reviewing'|'resolved'|'dismissed'" },
    { name: "admin_notes", type: "text", nullable: true },
    { name: "created_at", type: "timestamptz" },
    { name: "resolved_at", type: "timestamptz", nullable: true },
    { name: "resolved_by", type: "uuid", nullable: true },
  ],
  proposed_questions: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "category_id", type: "uuid" },
    { name: "submitted_by", type: "uuid", nullable: true },
    { name: "type", type: "text" },
    { name: "target_type", type: "text", note: "'question'|'flashcard'", nullable: true },
    { name: "question_en", type: "text" },
    { name: "question_es", type: "text" },
    { name: "options_en", type: "jsonb", nullable: true },
    { name: "options_es", type: "jsonb", nullable: true },
    { name: "correct_index", type: "integer", nullable: true },
    { name: "explanation_en", type: "text", nullable: true },
    { name: "explanation_es", type: "text", nullable: true },
    { name: "status", type: "text", note: "'pending'|'approved'|'rejected'" },
    { name: "admin_notes", type: "text", nullable: true },
    { name: "created_at", type: "timestamptz" },
    { name: "reviewed_at", type: "timestamptz", nullable: true },
    { name: "reviewed_by", type: "uuid", nullable: true },
  ],
  topic_proposals: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "submitted_by", type: "uuid", nullable: true },
    { name: "title_en", type: "text" },
    { name: "title_es", type: "text" },
    { name: "description_en", type: "text", nullable: true },
    { name: "description_es", type: "text", nullable: true },
    { name: "sample_questions", type: "jsonb", nullable: true },
    { name: "status", type: "text", note: "'pending'|'approved'|'rejected'" },
    { name: "admin_notes", type: "text", nullable: true },
    { name: "created_at", type: "timestamptz" },
    { name: "reviewed_at", type: "timestamptz", nullable: true },
    { name: "reviewed_by", type: "uuid", nullable: true },
  ],
  suspended_flashcards: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "user_id", type: "uuid", note: "FK→auth.users" },
    { name: "flashcard_id", type: "uuid", note: "FK→flashcards" },
    { name: "created_at", type: "timestamptz" },
  ],
  hidden_topics: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "user_id", type: "uuid", note: "FK→auth.users" },
    { name: "topic_id", type: "uuid", note: "FK→topics" },
    { name: "created_at", type: "timestamptz" },
  ],
  reading_progress: [
    { name: "id", type: "uuid", note: "PK" },
    { name: "user_id", type: "uuid", note: "FK→auth.users" },
    { name: "topic_id", type: "uuid", note: "FK→topics" },
    { name: "completed", type: "boolean" },
    { name: "created_at", type: "timestamptz" },
    { name: "updated_at", type: "timestamptz" },
  ],
};

// ─── learn_admin_summary ───────────────────────────────────────────
export async function handleAdminSummary(
  supabase: TypedClient,
): Promise<McpResult> {
  const { count: feedbackCount, error: fbErr } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true });
  if (fbErr) return err(fbErr.message);

  const { count: proposedQCount, error: pqErr } = await supabase
    .from("proposed_questions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (pqErr) return err(pqErr.message);

  const { count: proposalCount, error: tpErr } = await supabase
    .from("topic_proposals")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (tpErr) return err(tpErr.message);

  const { count: topicCount, error: thErr } = await supabase
    .from("topics")
    .select("id", { count: "exact", head: true });
  if (thErr) return err(thErr.message);

  const { count: catCount, error: catErr } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true });
  if (catErr) return err(catErr.message);

  const { count: qCount, error: qErr } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true });
  if (qErr) return err(qErr.message);

  const { count: fcCount, error: fcErr } = await supabase
    .from("flashcards")
    .select("id", { count: "exact", head: true });
  if (fcErr) return err(fcErr.message);

  const { data: recentQuestions } = await supabase
    .from("questions")
    .select("id, question_en, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  const { data: recentFlashcards } = await supabase
    .from("flashcards")
    .select("id, question_en, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  return ok({
    pending_feedback: feedbackCount ?? 0,
    pending_proposed_questions: proposedQCount ?? 0,
    pending_topic_proposals: proposalCount ?? 0,
    totals: {
      topics: topicCount ?? 0,
      categories: catCount ?? 0,
      questions: qCount ?? 0,
      flashcards: fcCount ?? 0,
    },
    recently_updated: {
      questions: recentQuestions || [],
      flashcards: recentFlashcards || [],
    },
  });
}

// ─── learn_schema_info ─────────────────────────────────────────────
export function handleSchemaInfo(
  params: { table_name?: string },
): McpResult {
  if (!params.table_name) {
    const tables = Object.entries(SCHEMA).map(([name, cols]) => ({
      name,
      column_count: cols.length,
      columns: cols.map((c) => c.name).join(", "),
    }));
    return ok({ tables });
  }

  const cols = SCHEMA[params.table_name];
  if (!cols) {
    return err(`Unknown table: ${params.table_name}. Known tables: ${Object.keys(SCHEMA).join(", ")}`);
  }

  return ok({ table: params.table_name, columns: cols });
}

// ─── learn_run_query ───────────────────────────────────────────────
type TableName = keyof Database["public"]["Tables"];
const ALLOWED_TABLES = new Set<string>(Object.keys(SCHEMA));

export async function handleRunQuery(
  supabase: TypedClient,
  params: {
    table: string;
    select?: string;
    filters?: Array<{ column: string; op: string; value?: unknown }>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  },
): Promise<McpResult> {
  if (!ALLOWED_TABLES.has(params.table)) {
    return err(`Invalid table: "${params.table}". Allowed tables: ${[...ALLOWED_TABLES].join(", ")}`);
  }

  // Dynamic table name requires cast since it's runtime-validated above
  let query = supabase.from(params.table as TableName).select(params.select ?? "*");

  if (params.filters) {
    for (const f of params.filters) {
      switch (f.op) {
        case "eq": query = query.eq(f.column, f.value as string); break;
        case "neq": query = query.neq(f.column, f.value as string); break;
        case "gt": query = query.gt(f.column, f.value as string); break;
        case "gte": query = query.gte(f.column, f.value as string); break;
        case "lt": query = query.lt(f.column, f.value as string); break;
        case "lte": query = query.lte(f.column, f.value as string); break;
        case "like": query = query.like(f.column, f.value as string); break;
        case "ilike": query = query.ilike(f.column, f.value as string); break;
        case "is": query = query.is(f.column, f.value as null); break;
        case "in": query = query.in(f.column, f.value as string[]); break;
        default: query = query.eq(f.column, f.value as string);
      }
    }
  }

  if (params.order) {
    query = query.order(params.order.column, { ascending: params.order.ascending ?? true });
  }

  query = query.limit(params.limit ?? 50);

  const { data, error } = await query;
  if (error) return err(error.message);

  return ok({ data: data || [] });
}

// ─── Registration ──────────────────────────────────────────────────
export function registerAdminTools(server: McpServer): void {
  server.tool(
    "learn_admin_summary",
    "Quick admin briefing: pending counts, total content, recently updated",
    {},
    { readOnlyHint: true },
    async () => handleAdminSummary(getSupabaseClient()),
  );

  server.tool(
    "learn_schema_info",
    "Database schema reference. Lists all tables or detailed column info for a specific table.",
    { table_name: z.string().optional().describe("Table name for detailed info") },
    { readOnlyHint: true },
    async ({ table_name }) => handleSchemaInfo({ table_name }),
  );

  server.tool(
    "learn_run_query",
    "Structured read-only query builder. SELECT only, no mutations.",
    {
      table: z.string().describe("Table name"),
      select: z.string().optional().describe("Column selection (default *)"),
      filters: z
        .array(
          z.object({
            column: z.string(),
            op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in"]),
            value: z.unknown().default(null),
          }),
        )
        .optional()
        .describe("Filter conditions"),
      order: z
        .object({
          column: z.string(),
          ascending: z.boolean().optional(),
        })
        .optional()
        .describe("Order by"),
      limit: z.number().int().min(1).max(1000).optional().describe("Max rows (default 50)"),
    },
    { readOnlyHint: true },
    async ({ table, select, filters, order, limit }) =>
      handleRunQuery(getSupabaseClient(), { table, select, filters, order, limit }),
  );
}
