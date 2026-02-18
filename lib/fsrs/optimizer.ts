import { createClient } from "@/lib/supabase/server";

/** Minimum valid optimizer items before optimization produces meaningful results */
export const MIN_REVIEWS_FOR_OPTIMIZATION = 50;

interface ReviewLogRow {
  flashcard_id: string;
  rating: number;
  elapsed_days_before: number | null;
  scheduled_days_before: number | null;
  stability_before: number | null;
  reviewed_at: string;
}

/** Plain review data extracted from logs (used by tests and the optimizer) */
export interface PlainReview {
  rating: 1 | 2 | 3 | 4;
  delta_t: number;
}

/** Plain item data (array of reviews per card prefix) */
export interface PlainFSRSItem {
  reviews: PlainReview[];
}

/**
 * Transform review_logs into plain FSRSItem data for the optimizer.
 * Groups by flashcard_id, orders by reviewed_at, builds incremental prefixes.
 *
 * Filters out items where no review has delta_t > 0 — the Rust FSRS optimizer
 * panics (process abort, not catchable) on items lacking at least one positive delta_t.
 */
export function transformReviewLogs(logs: ReviewLogRow[]): PlainFSRSItem[] {
  // Group by flashcard_id
  const grouped = new Map<string, ReviewLogRow[]>();
  for (const log of logs) {
    const arr = grouped.get(log.flashcard_id) || [];
    arr.push(log);
    grouped.set(log.flashcard_id, arr);
  }

  const items: PlainFSRSItem[] = [];

  for (const [, cardLogs] of grouped) {
    // Sort by reviewed_at ascending
    cardLogs.sort(
      (a, b) =>
        new Date(a.reviewed_at).getTime() - new Date(b.reviewed_at).getTime(),
    );

    // Build incremental FSRSItems (one per review step)
    // The optimizer expects items where each item represents a card's review
    // history up to a particular point
    const reviews: PlainReview[] = [];

    for (const log of cardLogs) {
      const isFirstReview = log.stability_before === null;
      const delta_t = isFirstReview ? 0 : (log.elapsed_days_before ?? 0);

      reviews.push({
        rating: log.rating as 1 | 2 | 3 | 4,
        delta_t,
      });

      // Only include items that have at least one review with delta_t > 0.
      // The Rust optimizer panics (aborts process) on items where all delta_t = 0.
      const hasPositiveDelta = reviews.some((r) => r.delta_t > 0);
      if (hasPositiveDelta) {
        items.push({
          reviews: [...reviews],
        });
      }
    }
  }

  return items;
}

/**
 * Count how many valid optimizer items the user has.
 * "Valid" means the item has at least one review with delta_t > 0
 * (i.e., the card was reviewed on a different day than its previous review).
 *
 * This is used by the UI to determine whether the "Optimize Now" button
 * should be enabled, since raw review_logs count can be misleading —
 * same-day reviews don't produce valid optimizer data.
 */
export async function countValidOptimizerItems(
  userId: string,
): Promise<number> {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("review_logs")
    .select(
      "flashcard_id, rating, elapsed_days_before, stability_before, reviewed_at",
    )
    .eq("user_id", userId)
    .order("reviewed_at", { ascending: true });

  if (!logs?.length) return 0;

  return transformReviewLogs(logs as ReviewLogRow[]).length;
}

/**
 * Fetch user's review logs and run the FSRS optimizer.
 * Returns optimized weights or null if not enough data.
 */
export async function optimizeUserParameters(userId: string): Promise<{
  weights: number[];
  reviewCount: number;
} | null> {
  const supabase = await createClient();

  // Fetch all review logs for this user
  const { data: logs, error } = await supabase
    .from("review_logs")
    .select(
      "flashcard_id, rating, elapsed_days_before, scheduled_days_before, stability_before, reviewed_at",
    )
    .eq("user_id", userId)
    .order("reviewed_at", { ascending: true });

  if (error || !logs?.length) {
    return null;
  }

  const validItems = transformReviewLogs(logs as ReviewLogRow[]);
  if (validItems.length < MIN_REVIEWS_FOR_OPTIMIZATION) {
    return null;
  }

  // Dynamic import to keep the native binary out of edge runtime bundles
  const { computeParameters, FSRSBindingItem, FSRSBindingReview } =
    await import("@open-spaced-repetition/binding");

  // Convert plain data to binding class instances
  const bindingItems = validItems.map(
    (item) =>
      new FSRSBindingItem(
        item.reviews.map((r) => new FSRSBindingReview(r.rating, r.delta_t)),
      ),
  );

  const result = await computeParameters(bindingItems, {
    enableShortTerm: true,
  });

  return {
    weights: Array.from(result),
    reviewCount: logs.length,
  };
}
