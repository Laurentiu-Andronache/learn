import type { SupabaseClient } from "@supabase/supabase-js";

export function buildSuspendedSet(
  suspended: { flashcard_id: string }[] | null,
): Set<string> {
  const set = new Set<string>();
  if (suspended) for (const s of suspended) set.add(s.flashcard_id);
  return set;
}

export function buildStateMap<T extends { flashcard_id: string }>(
  cardStates: T[] | null,
): Map<string, T> {
  const map = new Map<string, T>();
  if (cardStates) for (const cs of cardStates) map.set(cs.flashcard_id, cs);
  return map;
}

export async function fetchSuspendedSet(
  supabase: SupabaseClient,
  userId: string,
  flashcardIds: string[],
): Promise<Set<string>> {
  const { data } = await supabase
    .from("suspended_flashcards")
    .select("flashcard_id")
    .eq("user_id", userId)
    .in("flashcard_id", flashcardIds);
  return buildSuspendedSet(data);
}
