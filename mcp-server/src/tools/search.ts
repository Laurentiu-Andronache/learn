import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type TypedClient, getSupabaseClient } from "../supabase.js";
import { type McpResult, ok, err } from "../utils.js";

// ─── learn_search (unified cross-content search) ────────────────────

export async function handleUnifiedSearch(
  supabase: TypedClient,
  params: {
    query: string;
    types?: string[];
    topic_id?: string;
    lang?: string;
    limit?: number;
  }
): Promise<McpResult> {
  const { data, error } = await supabase.rpc("search_content", {
    search_query: params.query,
    content_types: params.types ?? ["questions", "flashcards"],
    filter_topic_id: params.topic_id ?? null,
    filter_lang: params.lang ?? null,
    max_results: params.limit ?? 30,
  });

  if (error) return err(error.message);
  return ok(data ?? []);
}

// ─── learn_find_similar ─────────────────────────────────────────────

export async function handleFindSimilar(
  supabase: TypedClient,
  params: {
    id: string;
    type: string;
    threshold?: number;
    limit?: number;
  }
): Promise<McpResult> {
  const { data, error } = await supabase.rpc("find_similar_content", {
    source_id: params.id,
    source_type: params.type,
    similarity_threshold: params.threshold ?? 0.3,
    max_results: params.limit ?? 10,
  });

  if (error) return err(error.message);
  return ok(data ?? []);
}

// ─── learn_find_overlaps (topic-level duplicate detection) ──────────

export async function handleFindOverlaps(
  supabase: TypedClient,
  params: {
    topic_id: string;
    threshold?: number;
    limit?: number;
  }
): Promise<McpResult> {
  const threshold = params.threshold ?? 0.3;
  const limit = params.limit ?? 50;

  // Fetch all flashcard and question IDs for the topic
  const [fRes, qRes] = await Promise.all([
    supabase
      .from("flashcards")
      .select("id, question_en, categories!inner(topic_id)")
      .eq("categories.topic_id", params.topic_id),
    supabase
      .from("questions")
      .select("id, question_en, categories!inner(topic_id)")
      .eq("categories.topic_id", params.topic_id),
  ]);

  if (fRes.error) return err(fRes.error.message);
  if (qRes.error) return err(qRes.error.message);

  const items: Array<{ id: string; type: string; question_en: string }> = [
    ...(fRes.data ?? []).map((f) => ({ id: f.id, type: "flashcard", question_en: f.question_en })),
    ...(qRes.data ?? []).map((q) => ({ id: q.id, type: "question", question_en: q.question_en })),
  ];

  if (items.length === 0) return ok({ overlaps: [], total: 0 });

  // Run similarity checks for each item (batched via DB function)
  const seen = new Set<string>();
  const overlaps: Array<{
    source_id: string;
    source_type: string;
    source_question: string;
    match_id: string;
    match_type: string;
    match_question: string;
    similarity: number;
  }> = [];

  for (const item of items) {
    const { data, error } = await supabase.rpc("find_similar_content", {
      source_id: item.id,
      source_type: item.type,
      similarity_threshold: threshold,
      max_results: 5,
    });
    if (error) continue;

    for (const match of data ?? []) {
      const pairKey = [item.id, match.id].sort().join(":");
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      overlaps.push({
        source_id: item.id,
        source_type: item.type,
        source_question: item.question_en,
        match_id: match.id,
        match_type: match.content_type,
        match_question: match.question_en,
        similarity: match.similarity_score,
      });
    }

    if (overlaps.length >= limit) break;
  }

  overlaps.sort((a, b) => b.similarity - a.similarity);
  return ok({ overlaps: overlaps.slice(0, limit), total: overlaps.length });
}

// ─── Registration ───────────────────────────────────────────────────

export function registerSearchTools(server: McpServer): void {
  server.tool(
    "learn_search",
    "Unified search across questions and flashcards. Splits multi-word queries into OR terms, ranks by pg_trgm similarity. Searches all text fields (question, explanation/answer, extra) in both languages.",
    {
      query: z.string().describe("Search query (multi-word splits into OR terms)"),
      types: z.array(z.enum(["questions", "flashcards"])).optional()
        .describe("Content types to search (default both)"),
      topic_id: z.string().uuid().optional().describe("Filter by topic UUID"),
      lang: z.enum(["en", "es"]).optional().describe("Limit search to one language"),
      limit: z.number().min(1).max(100).optional().describe("Max results (default 30)"),
    },
    { readOnlyHint: true },
    async (params) => handleUnifiedSearch(getSupabaseClient(), params),
  );

  server.tool(
    "learn_find_similar",
    "Find content similar to a given flashcard or question using pg_trgm similarity. Returns matches above the threshold sorted by similarity score.",
    {
      id: z.string().uuid().describe("Source flashcard or question UUID"),
      type: z.enum(["question", "flashcard"]).describe("Source content type"),
      threshold: z.number().min(0).max(1).optional()
        .describe("Minimum similarity score 0.0-1.0 (default 0.3)"),
      limit: z.number().min(1).max(50).optional().describe("Max results (default 10)"),
    },
    { readOnlyHint: true },
    async (params) => handleFindSimilar(getSupabaseClient(), params),
  );

  server.tool(
    "learn_find_overlaps",
    "Find duplicate/overlapping content within a topic. Runs pairwise similarity on all flashcards and questions, returns pairs above threshold.",
    {
      topic_id: z.string().uuid().describe("Topic UUID to scan for overlaps"),
      threshold: z.number().min(0).max(1).optional()
        .describe("Minimum similarity score 0.0-1.0 (default 0.3)"),
      limit: z.number().min(1).max(200).optional().describe("Max overlap pairs to return (default 50)"),
    },
    { readOnlyHint: true },
    async (params) => handleFindOverlaps(getSupabaseClient(), params),
  );
}
