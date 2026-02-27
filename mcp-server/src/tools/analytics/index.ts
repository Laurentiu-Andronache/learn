import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabaseClient } from "../../supabase.js";
import { handleTopicStats } from "./topic-stats.js";
import { handleQuestionQualityReport } from "./question-quality.js";
import { handleUserActivityStats } from "./user-activity.js";
import { handleDifficultyAnalysis } from "./difficulty.js";
import { handleContentHealth } from "./content-health.js";
import { handleAdminBriefing } from "./admin-briefing.js";
import { handleListClaims } from "./claims.js";

// Re-export all handlers for direct imports (used by tests)
export { handleTopicStats } from "./topic-stats.js";
export { handleQuestionQualityReport } from "./question-quality.js";
export { handleUserActivityStats } from "./user-activity.js";
export { handleDifficultyAnalysis } from "./difficulty.js";
export { handleContentHealth } from "./content-health.js";
export { handleAdminBriefing } from "./admin-briefing.js";
export { handleListClaims } from "./claims.js";

/** Alias: handleContentOverview is the same as handleContentHealth */
export const handleContentOverview = handleContentHealth;

export function registerAnalyticsTools(server: McpServer): void {
  server.tool(
    "learn_topic_stats",
    "Get statistics for a specific topic: category count, question count, difficulty distribution, type breakdown, translation completeness",
    { topic_id: z.string().uuid().describe("Topic UUID") },
    { readOnlyHint: true },
    async ({ topic_id }) => handleTopicStats(getSupabaseClient(), { topic_id }),
  );

  server.tool(
    "learn_content_overview",
    "Global content dashboard (alias for learn_content_health): per-topic summary with quality issues, translation gaps, and totals",
    {},
    { readOnlyHint: true },
    async () => handleContentHealth(getSupabaseClient()),
  );

  server.tool(
    "learn_question_quality_report",
    "Find quality issues: missing translations, explanations, mismatched option counts",
    { topic_id: z.string().uuid().optional().describe("Optional topic UUID filter") },
    { readOnlyHint: true },
    async ({ topic_id }) => handleQuestionQualityReport(getSupabaseClient(), { topic_id }),
  );

  server.tool(
    "learn_user_activity_stats",
    "User engagement stats: total flashcard reviews, unique users, hardest flashcards (by incorrect rate)",
    {
      topic_id: z.string().uuid().optional().describe("Optional topic UUID filter"),
      since: z.string().optional().describe("ISO date string filter"),
    },
    { readOnlyHint: true },
    async ({ topic_id, since }) => handleUserActivityStats(getSupabaseClient(), { topic_id, since }),
  );

  server.tool(
    "learn_difficulty_analysis",
    "Compare assigned difficulty vs actual performance for questions in a topic",
    { topic_id: z.string().uuid().describe("Topic UUID") },
    { readOnlyHint: true },
    async ({ topic_id }) => handleDifficultyAnalysis(getSupabaseClient(), { topic_id }),
  );

  server.tool(
    "learn_content_health",
    "Combined content health dashboard: per-topic summary with quality issues, translation gaps, and totals in a single call",
    {},
    { readOnlyHint: true },
    async () => handleContentHealth(getSupabaseClient()),
  );

  server.tool(
    "learn_admin_briefing",
    "Comprehensive admin dashboard: user growth, engagement (24h/7d), learning quality, per-user daily activity, streaks, topic engagement, content snapshot, moderation queue",
    {},
    { readOnlyHint: true },
    async () => handleAdminBriefing(getSupabaseClient()),
  );

  server.tool(
    "learn_list_claims",
    "Extract numeric claims, percentages, and superlatives from all content in a topic for fact-check review. Scans question text, explanations, answers, and extras.",
    { topic_id: z.string().uuid().describe("Topic UUID to scan for claims") },
    { readOnlyHint: true },
    async ({ topic_id }) => handleListClaims(getSupabaseClient(), { topic_id }),
  );
}
