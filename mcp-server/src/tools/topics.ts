import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseClient } from "../supabase.js";

type McpResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

function ok(data: unknown): McpResult {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(msg: string): McpResult {
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

/* ── learn_list_topics ── */

export async function handleListTopics(
  supabase: SupabaseClient,
  params: { is_active?: boolean; limit?: number; offset?: number },
): Promise<McpResult> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("themes")
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (params.is_active !== undefined) {
    query = query.eq("is_active", params.is_active);
  }

  const { data: topics, error, count } = await query;
  if (error) return err(error.message);

  const ids = (topics ?? []).map((t: any) => t.id);

  // Category counts
  const catCountMap: Record<string, number> = {};
  const qCountMap: Record<string, number> = {};
  const fcCountMap: Record<string, number> = {};

  if (ids.length > 0) {
    const { data: catCounts } = await supabase
      .from("categories")
      .select("theme_id, count:id", { count: "exact" })
      .in("theme_id", ids);

    for (const row of catCounts ?? []) {
      catCountMap[(row as any).theme_id] = Number((row as any).count);
    }

    // Question counts via categories
    const { data: qCounts } = await supabase
      .from("questions")
      .select("category_id:categories!inner(theme_id), count:id")
      .in("categories.theme_id", ids);

    for (const row of qCounts ?? []) {
      const themeId = (row as any).theme_id ?? (row as any).category_id;
      qCountMap[themeId] = Number((row as any).count);
    }

    // Flashcard counts via categories
    const { data: fcCounts } = await supabase
      .from("flashcards")
      .select("category_id:categories!inner(theme_id), count:id")
      .in("categories.theme_id", ids);

    for (const row of fcCounts ?? []) {
      const themeId = (row as any).theme_id ?? (row as any).category_id;
      fcCountMap[themeId] = Number((row as any).count);
    }
  }

  const enriched = (topics ?? []).map((t: any) => ({
    ...t,
    category_count: catCountMap[t.id] ?? 0,
    question_count: qCountMap[t.id] ?? 0,
    flashcard_count: fcCountMap[t.id] ?? 0,
  }));

  return ok({ topics: enriched, total: count ?? 0, limit, offset });
}

/* ── learn_get_topic ── */

export async function handleGetTopic(
  supabase: SupabaseClient,
  params: { topic_id: string },
): Promise<McpResult> {
  const { data: topic, error } = await supabase
    .from("themes")
    .select("*")
    .eq("id", params.topic_id)
    .single();

  if (error) return err(error.message);

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("theme_id", params.topic_id)
    .order("created_at", { ascending: true });

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

  const enrichedCats = (categories ?? []).map((c: any) => ({
    ...c,
    question_count: qCountMap[c.id] ?? 0,
    flashcard_count: fcCountMap[c.id] ?? 0,
  }));

  return ok({ ...topic, categories: enrichedCats });
}

/* ── learn_create_topic ── */

export async function handleCreateTopic(
  supabase: SupabaseClient,
  params: {
    title_en: string; title_es: string;
    description_en?: string; description_es?: string;
    icon?: string; color?: string;
    intro_text_en?: string; intro_text_es?: string;
    creator_id?: string;
  },
): Promise<McpResult> {
  const { title_en, title_es, ...optional } = params;
  const insert: Record<string, unknown> = { title_en, title_es, is_active: true };
  for (const [k, v] of Object.entries(optional)) {
    if (v !== undefined) insert[k] = v;
  }

  const { data, error } = await supabase.from("themes").insert(insert).select().single();
  if (error) return err(error.message);

  console.error(`[audit] created topic ${data.id}: ${title_en}`);
  return ok(data);
}

/* ── learn_update_topic ── */

export async function handleUpdateTopic(
  supabase: SupabaseClient,
  params: {
    topic_id: string;
    title_en?: string; title_es?: string;
    description_en?: string; description_es?: string;
    icon?: string; color?: string;
    intro_text_en?: string; intro_text_es?: string;
    is_active?: boolean;
  },
): Promise<McpResult> {
  const { topic_id, ...fields } = params;
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) updates[k] = v;
  }

  const { data, error } = await supabase
    .from("themes")
    .update(updates)
    .eq("id", topic_id)
    .select()
    .single();

  if (error) return err(error.message);

  console.error(`[audit] updated topic ${topic_id}`);
  return ok(data);
}

/* ── learn_delete_topic (soft) ── */

export async function handleDeleteTopic(
  supabase: SupabaseClient,
  params: { topic_id: string },
): Promise<McpResult> {
  const { data, error } = await supabase
    .from("themes")
    .update({ is_active: false })
    .eq("id", params.topic_id)
    .select()
    .single();

  if (error) return err(error.message);

  console.error(`[audit] deactivated topic ${params.topic_id}`);
  return ok({ message: `Topic ${params.topic_id} deactivated`, ...data });
}

/* ── learn_hard_delete_topic ── */

export async function handleHardDeleteTopic(
  supabase: SupabaseClient,
  params: { topic_id: string; confirm: string },
): Promise<McpResult> {
  if (params.confirm !== "PERMANENTLY DELETE") {
    return err('Confirm param must be exactly "PERMANENTLY DELETE"');
  }

  const { error } = await supabase
    .from("themes")
    .delete()
    .eq("id", params.topic_id);

  if (error) return err(error.message);

  console.error(`[audit] permanently deleted topic ${params.topic_id}`);
  return ok({ message: `Topic ${params.topic_id} permanently deleted` });
}

/* ── Registration ── */

export function registerTopicTools(server: McpServer): void {
  server.tool(
    "learn_list_topics",
    "List all topics with category/question counts",
    {
      is_active: z.boolean().optional().describe("Filter by active status"),
      limit: z.number().default(50).describe("Max results"),
      offset: z.number().default(0).describe("Offset for pagination"),
    },
    async (params) => handleListTopics(getSupabaseClient(), params),
  );

  server.tool(
    "learn_get_topic",
    "Get full topic detail with nested categories and question counts",
    { topic_id: z.string().describe("Topic UUID") },
    async (params) => handleGetTopic(getSupabaseClient(), params),
  );

  server.tool(
    "learn_create_topic",
    "Create a new topic",
    {
      title_en: z.string().describe("English title"),
      title_es: z.string().describe("Spanish title"),
      description_en: z.string().optional().describe("English description"),
      description_es: z.string().optional().describe("Spanish description"),
      icon: z.string().optional().describe("Emoji icon"),
      color: z.string().optional().describe("Hex color"),
      intro_text_en: z.string().optional().describe("English intro markdown"),
      intro_text_es: z.string().optional().describe("Spanish intro markdown"),
      creator_id: z.string().optional().describe("Creator profile UUID"),
    },
    async (params) => handleCreateTopic(getSupabaseClient(), params),
  );

  server.tool(
    "learn_update_topic",
    "Update an existing topic (partial update)",
    {
      topic_id: z.string().describe("Topic UUID"),
      title_en: z.string().optional().describe("English title"),
      title_es: z.string().optional().describe("Spanish title"),
      description_en: z.string().optional().describe("English description"),
      description_es: z.string().optional().describe("Spanish description"),
      icon: z.string().optional().describe("Emoji icon"),
      color: z.string().optional().describe("Hex color"),
      intro_text_en: z.string().optional().describe("English intro markdown"),
      intro_text_es: z.string().optional().describe("Spanish intro markdown"),
      is_active: z.boolean().optional().describe("Active status"),
    },
    async (params) => handleUpdateTopic(getSupabaseClient(), params),
  );

  server.tool(
    "learn_delete_topic",
    "Soft-delete a topic (sets is_active=false)",
    { topic_id: z.string().describe("Topic UUID") },
    async (params) => handleDeleteTopic(getSupabaseClient(), params),
  );

  server.tool(
    "learn_hard_delete_topic",
    "Permanently delete a topic and all its data",
    {
      topic_id: z.string().describe("Topic UUID"),
      confirm: z.string().describe('Must be exactly "PERMANENTLY DELETE"'),
    },
    async (params) => handleHardDeleteTopic(getSupabaseClient(), params),
  );
}
