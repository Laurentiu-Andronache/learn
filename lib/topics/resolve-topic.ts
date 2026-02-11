import { createClient } from "@/lib/supabase/server";

const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-/;

/**
 * Resolve a topic from a URL param that may be a UUID or a slug.
 * Returns the full topic row (with creator) or null.
 */
export async function resolveTopic(param: string) {
  const supabase = await createClient();
  const isUuid = UUID_PREFIX.test(param);

  const { data } = await supabase
    .from("topics")
    .select("*, creator:profiles!creator_id(display_name)")
    .eq(isUuid ? "id" : "slug", param)
    .single();

  return data;
}

/**
 * Resolve a topic with a minimal select (for pages that only need a few fields).
 * Pass the select string explicitly.
 */
export async function resolveTopicSelect<T = Record<string, unknown>>(
  param: string,
  select: string,
): Promise<T | null> {
  const supabase = await createClient();
  const isUuid = UUID_PREFIX.test(param);

  const { data } = await supabase
    .from("topics")
    .select(select)
    .eq(isUuid ? "id" : "slug", param)
    .single();

  return data as T | null;
}

/**
 * Check if a param is a UUID (vs a slug).
 */
export function isUuidParam(param: string): boolean {
  return UUID_PREFIX.test(param);
}
