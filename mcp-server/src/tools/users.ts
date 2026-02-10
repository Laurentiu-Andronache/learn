import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseClient } from "../supabase.js";
import { type McpResult, ok, err } from "../utils.js";

// ─── learn_list_users ──────────────────────────────────────────────
export async function handleListUsers(
  supabase: SupabaseClient,
  params: { search?: string; limit?: number; offset?: number },
): Promise<McpResult> {
  let query = supabase.from("profiles").select("*", { count: "exact" });

  if (params.search) {
    query = query.ilike("display_name", `%${params.search}%`);
  }

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return err(error.message);

  return ok({ users: data || [], total: count ?? 0 });
}

// ─── learn_get_user ────────────────────────────────────────────────
export async function handleGetUser(
  supabase: SupabaseClient,
  params: { user_id?: string; display_name?: string },
): Promise<McpResult> {
  if (!params.user_id && !params.display_name) {
    return err("Either user_id or display_name is required");
  }

  let profileQuery = supabase.from("profiles").select("*");
  if (params.user_id) {
    profileQuery = profileQuery.eq("id", params.user_id);
  } else {
    profileQuery = profileQuery.eq("display_name", params.display_name!);
  }

  const { data: profile, error: profErr } = await (profileQuery as any).single();
  if (profErr) return err(profErr.message);
  if (!profile) return err("User not found");

  const userId = (profile as any).id;

  const { count: topicCount } = await supabase
    .from("topics")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", userId);

  const { count: reviewCount } = await supabase
    .from("review_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return ok({
    profile,
    topics_created: topicCount ?? 0,
    review_count: reviewCount ?? 0,
  });
}

// ─── learn_active_users ────────────────────────────────────────────
function parseSinceDate(since: string): string {
  const shorthand = since.match(/^(\d+)(h|d)$/);
  if (shorthand) {
    const amount = parseInt(shorthand[1], 10);
    const unit = shorthand[2];
    const now = new Date();
    if (unit === "h") now.setHours(now.getHours() - amount);
    else now.setDate(now.getDate() - amount);
    return now.toISOString();
  }
  return since;
}

export async function handleActiveUsers(
  supabase: SupabaseClient,
  params: { since: string },
): Promise<McpResult> {
  const sinceDate = parseSinceDate(params.since);

  const { data: logs, error } = await supabase
    .from("review_logs")
    .select("user_id, reviewed_at")
    .gte("reviewed_at", sinceDate);
  if (error) return err(error.message);

  const userMap = new Map<string, { user_id: string; review_count: number; last_active: string }>();
  for (const log of logs || []) {
    const existing = userMap.get(log.user_id);
    if (existing) {
      existing.review_count++;
      if (log.reviewed_at > existing.last_active) existing.last_active = log.reviewed_at;
    } else {
      userMap.set(log.user_id, {
        user_id: log.user_id,
        review_count: 1,
        last_active: log.reviewed_at,
      });
    }
  }

  const users = Array.from(userMap.values()).sort((a, b) => b.review_count - a.review_count);

  return ok({
    since: sinceDate,
    active_user_count: users.length,
    users,
  });
}

// ─── learn_user_topics ─────────────────────────────────────────────
export async function handleUserTopics(
  supabase: SupabaseClient,
  params: { user_id?: string; display_name?: string },
): Promise<McpResult> {
  if (!params.user_id && !params.display_name) {
    return err("Either user_id or display_name is required");
  }

  let userId = params.user_id;
  if (!userId && params.display_name) {
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", params.display_name)
      .single();
    if (profErr) return err(profErr.message);
    if (!profile) return err("User not found");
    userId = profile.id;
  }

  const { data: topics, error } = await supabase
    .from("topics")
    .select("*")
    .eq("creator_id", userId!);
  if (error) return err(error.message);

  return ok({ topics: topics || [] });
}

// ─── Registration ──────────────────────────────────────────────────
export function registerUserTools(server: McpServer): void {
  server.tool(
    "learn_list_users",
    "List user profiles, with optional search by display name",
    {
      search: z.string().optional().describe("Search display_name (case-insensitive)"),
      limit: z.number().int().min(1).max(200).optional().describe("Max results (default 50)"),
      offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
    },
    { readOnlyHint: true },
    async ({ search, limit, offset }) => handleListUsers(getSupabaseClient(), { search, limit, offset }),
  );

  server.tool(
    "learn_get_user",
    "Get a user profile with topic creation count and review count",
    {
      user_id: z.string().uuid().optional().describe("User UUID"),
      display_name: z.string().optional().describe("Display name (exact match)"),
    },
    { readOnlyHint: true },
    async ({ user_id, display_name }) => handleGetUser(getSupabaseClient(), { user_id, display_name }),
  );

  server.tool(
    "learn_active_users",
    "List users active since a given time. Supports ISO dates or shorthand (24h, 7d, 30d).",
    {
      since: z.string().describe("ISO date or shorthand: 24h, 7d, 30d"),
    },
    { readOnlyHint: true },
    async ({ since }) => handleActiveUsers(getSupabaseClient(), { since }),
  );

  server.tool(
    "learn_user_topics",
    "List topics created by a user",
    {
      user_id: z.string().uuid().optional().describe("User UUID"),
      display_name: z.string().optional().describe("Display name (exact match)"),
    },
    { readOnlyHint: true },
    async ({ user_id, display_name }) => handleUserTopics(getSupabaseClient(), { user_id, display_name }),
  );
}
