"use server";

import {
  MIN_REVIEWS_FOR_OPTIMIZATION,
  optimizeUserParameters,
} from "@/lib/fsrs/optimizer";
import { createClient, requireUserId } from "@/lib/supabase/server";

// --- FSRS Parameter Optimization ---

/** Reviews required since last optimization before auto-re-optimizing */
const AUTO_REOPTIMIZE_REVIEWS = 100;

export async function optimizeFsrsParameters(): Promise<
  | { success: true; weights: number[]; reviewCount: number }
  | { success: false; error: string; reviewCount?: number }
> {
  const { supabase, userId } = await requireUserId();

  try {
    const result = await optimizeUserParameters(userId);
    if (!result) {
      // optimizeUserParameters returns null when valid items < threshold.
      // Valid items require spaced reviews (delta_t > 0), so same-day-only
      // review data won't produce enough items even with many raw reviews.
      return {
        success: false,
        error: "not_enough_reviews",
      };
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        fsrs_weights: result.weights,
        fsrs_weights_updated_at: now,
        updated_at: now,
      })
      .eq("id", userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      weights: result.weights,
      reviewCount: result.reviewCount,
    };
  } catch (e) {
    console.error("FSRS optimization failed:", e);
    return {
      success: false,
      error: "optimization_failed",
    };
  }
}

export async function resetFsrsWeights(): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("profiles")
    .update({
      fsrs_weights: null,
      fsrs_weights_updated_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Check if auto-optimization should run and trigger it in the background.
 * Called after each review via `after()` to avoid blocking.
 */
export async function maybeAutoOptimize(userId: string): Promise<void> {
  try {
    const supabase = await createClient();

    // Get current optimization state
    const { data: profile } = await supabase
      .from("profiles")
      .select("fsrs_weights_updated_at")
      .eq("id", userId)
      .single();

    // Count total reviews
    const { count: totalReviews } = await supabase
      .from("review_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const total = totalReviews ?? 0;
    if (total < MIN_REVIEWS_FOR_OPTIMIZATION) return;

    if (!profile?.fsrs_weights_updated_at) {
      // Never optimized — run it
      await optimizeFsrsParameters();
      return;
    }

    // Count reviews since last optimization
    const { count: reviewsSinceOpt } = await supabase
      .from("review_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gt("reviewed_at", profile.fsrs_weights_updated_at);

    if ((reviewsSinceOpt ?? 0) >= AUTO_REOPTIMIZE_REVIEWS) {
      await optimizeFsrsParameters();
    }
  } catch (e) {
    // Auto-optimization is best-effort, don't throw
    console.error("Auto-optimization check failed:", e);
  }
}
