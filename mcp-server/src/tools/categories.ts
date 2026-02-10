import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseClient } from "../supabase.js";
import { type McpResult, ok, err } from "../utils.js";

/* ── learn_list_categories ── */

export async function handleListCategories(
  supabase: SupabaseClient,
  params: { topic_id?: string; limit?: number; offset?: number },
): Promise<McpResult> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("categories")
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: true });

  if (params.topic_id) {
    query = query.eq("topic_id", params.topic_id);
  }

  const { data: categories, error, count } = await query;
  if (error) return err(error.message);

  const catIds = (categories ?? []).map((c: any) => c.id);
  const qCountMap: Record<string, number> = {};
  const fcCountMap: Record<string, number> = {};

  if (catIds.length > 0) {
    const { data: qCounts } = await supabase
      .from("questions")
      .select("category_id, count:id")
      .in("category_id", catIds);

    for (const row of qCounts ?? []) {
      qCountMap[(row as any).category_id] = Number((row as any).count);
    }

    const { data: fcCounts } = await supabase
      .from("flashcards")
      .select("category_id, count:id")
      .in("category_id", catIds);

    for (const row of fcCounts ?? []) {
      fcCountMap[(row as any).category_id] = Number((row as any).count);
    }
  }

  const enriched = (categories ?? []).map((c: any) => ({
    ...c,
    question_count: qCountMap[c.id] ?? 0,
    flashcard_count: fcCountMap[c.id] ?? 0,
  }));

  return ok({ categories: enriched, total: count ?? 0, limit, offset });
}

/* ── learn_create_category ── */

export async function handleCreateCategory(
  supabase: SupabaseClient,
  params: { topic_id: string; name_en: string; name_es: string; slug: string; color?: string },
): Promise<McpResult> {
  const insert: Record<string, unknown> = {
    topic_id: params.topic_id,
    name_en: params.name_en,
    name_es: params.name_es,
    slug: params.slug,
  };
  if (params.color !== undefined) insert.color = params.color;

  const { data, error } = await supabase.from("categories").insert(insert).select().single();
  if (error) return err(error.message);

  console.error(`[audit] created category ${data.id}: ${params.name_en}`);
  return ok(data);
}

/* ── learn_update_category ── */

export async function handleUpdateCategory(
  supabase: SupabaseClient,
  params: { category_id: string; name_en?: string; name_es?: string; slug?: string; color?: string },
): Promise<McpResult> {
  const { category_id, ...fields } = params;
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) updates[k] = v;
  }

  if (Object.keys(updates).length === 0) {
    return err("No fields to update");
  }

  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", category_id)
    .select()
    .single();

  if (error) return err(error.message);

  console.error(`[audit] updated category ${category_id}`);
  return ok(data);
}

/* ── learn_delete_category ── */

export async function handleDeleteCategory(
  supabase: SupabaseClient,
  params: { category_id: string; confirm: string },
): Promise<McpResult> {
  if (params.confirm !== "DELETE") {
    return err('Confirm param must be exactly "DELETE"');
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", params.category_id);

  if (error) return err(error.message);

  console.error(`[audit] deleted category ${params.category_id}`);
  return ok({ message: `Category ${params.category_id} deleted` });
}

/* ── learn_move_category ── */

export async function handleMoveCategory(
  supabase: SupabaseClient,
  params: { category_id: string; new_topic_id: string },
): Promise<McpResult> {
  const { data, error } = await supabase
    .from("categories")
    .update({ topic_id: params.new_topic_id })
    .eq("id", params.category_id)
    .select()
    .single();

  if (error) return err(error.message);

  console.error(`[audit] moved category ${params.category_id} to topic ${params.new_topic_id}`);
  return ok(data);
}

/* ── Registration ── */

export function registerCategoryTools(server: McpServer): void {
  server.tool(
    "learn_list_categories",
    "List categories with question counts, optionally filtered by topic",
    {
      topic_id: z.string().optional().describe("Filter by topic UUID"),
      limit: z.number().default(50).describe("Max results"),
      offset: z.number().default(0).describe("Offset for pagination"),
    },
    { readOnlyHint: true },
    async (params) => handleListCategories(getSupabaseClient(), params),
  );

  server.tool(
    "learn_create_category",
    "Create a new category under a topic",
    {
      topic_id: z.string().describe("Parent topic UUID"),
      name_en: z.string().describe("English name"),
      name_es: z.string().describe("Spanish name"),
      slug: z.string().describe("URL-friendly slug"),
      color: z.string().optional().describe("Hex color"),
    },
    async (params) => handleCreateCategory(getSupabaseClient(), params),
  );

  server.tool(
    "learn_update_category",
    "Update a category (partial update)",
    {
      category_id: z.string().describe("Category UUID"),
      name_en: z.string().optional().describe("English name"),
      name_es: z.string().optional().describe("Spanish name"),
      slug: z.string().optional().describe("URL-friendly slug"),
      color: z.string().optional().describe("Hex color"),
    },
    async (params) => handleUpdateCategory(getSupabaseClient(), params),
  );

  server.tool(
    "learn_delete_category",
    "Delete a category and all its questions",
    {
      category_id: z.string().describe("Category UUID"),
      confirm: z.string().describe('Must be exactly "DELETE"'),
    },
    { destructiveHint: true },
    async (params) => handleDeleteCategory(getSupabaseClient(), params),
  );

  server.tool(
    "learn_move_category",
    "Move a category to a different topic",
    {
      category_id: z.string().describe("Category UUID"),
      new_topic_id: z.string().describe("Destination topic UUID"),
    },
    async (params) => handleMoveCategory(getSupabaseClient(), params),
  );
}
