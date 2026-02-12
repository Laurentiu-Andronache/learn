import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type TypedClient, getSupabaseClient } from "../supabase.js";
import { type McpResult, ok, err } from "../utils.js";

// ─── learn_list_feedback ───────────────────────────────────────────
export async function handleListFeedback(
  supabase: TypedClient,
  params: { type?: string; limit?: number },
): Promise<McpResult> {
  let query = supabase.from("feedback").select("*");

  if (params.type) {
    query = query.eq("type", params.type);
  }

  query = query.order("created_at", { ascending: false }).limit(params.limit ?? 50);

  const { data, error } = await query;
  if (error) return err(error.message);

  return ok({ feedback: data || [] });
}

// ─── learn_delete_feedback ─────────────────────────────────────────
export async function handleDeleteFeedback(
  supabase: TypedClient,
  params: { feedback_id: string },
): Promise<McpResult> {
  const { error } = await supabase
    .from("feedback")
    .delete()
    .eq("id", params.feedback_id);
  if (error) return err(error.message);

  console.error(`[audit] Deleted feedback ${params.feedback_id}`);
  return { content: [{ type: "text" as const, text: `Deleted feedback ${params.feedback_id}` }] };
}

// ─── learn_list_proposed_questions ─────────────────────────────────
export async function handleListProposedQuestions(
  supabase: TypedClient,
  params: { status?: string; limit?: number },
): Promise<McpResult> {
  let query = supabase
    .from("proposed_questions")
    .select("*, categories(name_en, name_es, topic_id)");

  if (params.status) {
    query = query.eq("status", params.status);
  }

  query = query.order("created_at", { ascending: false }).limit(params.limit ?? 50);

  const { data, error } = await query;
  if (error) return err(error.message);

  return ok({ proposed_questions: data || [] });
}

// ─── learn_review_proposed_question ────────────────────────────────
export async function handleReviewProposedQuestion(
  supabase: TypedClient,
  params: {
    proposed_question_id: string;
    action: string;
    admin_notes?: string;
    promote?: boolean;
  },
): Promise<McpResult> {
  const status = params.action === "approve" ? "approved" : "rejected";
  const updateData: Record<string, unknown> = {
    status,
    reviewed_at: new Date().toISOString(),
  };
  if (params.admin_notes) updateData.admin_notes = params.admin_notes;

  const { data: updated, error: upErr } = await supabase
    .from("proposed_questions")
    .update(updateData)
    .eq("id", params.proposed_question_id)
    .select("*")
    .single();
  if (upErr) return err(upErr.message);

  let promoted = false;
  let promotion_error: string | null = null;
  if (params.action === "approve" && params.promote && updated) {
    const targetType = updated.target_type ?? "question";

    if (targetType === "flashcard") {
      const { error: insertErr } = await supabase.from("flashcards").insert({
        category_id: updated.category_id,
        question_en: updated.question_en,
        question_es: updated.question_es,
        answer_en: updated.explanation_en ?? "",
        answer_es: updated.explanation_es ?? "",
        difficulty: 5,
      });
      if (insertErr) promotion_error = insertErr.message;
      else promoted = true;
    } else {
      const { error: insertErr } = await supabase.from("questions").insert({
        category_id: updated.category_id,
        type: updated.type,
        question_en: updated.question_en,
        question_es: updated.question_es,
        options_en: updated.options_en,
        options_es: updated.options_es,
        correct_index: updated.correct_index,
        explanation_en: updated.explanation_en,
        explanation_es: updated.explanation_es,
        difficulty: 5,
      });
      if (insertErr) promotion_error = insertErr.message;
      else promoted = true;
    }
  }

  console.error(`[audit] Reviewed proposed question ${params.proposed_question_id}: ${status}`);
  return ok({ ...updated, promoted, ...(promotion_error ? { promotion_error } : {}) });
}

// ─── learn_list_topic_proposals ────────────────────────────────────
export async function handleListTopicProposals(
  supabase: TypedClient,
  params: { status?: string; limit?: number },
): Promise<McpResult> {
  let query = supabase.from("topic_proposals").select("*");

  if (params.status) {
    query = query.eq("status", params.status);
  }

  query = query.order("created_at", { ascending: false }).limit(params.limit ?? 50);

  const { data, error } = await query;
  if (error) return err(error.message);

  return ok({ proposals: data || [] });
}

// ─── learn_review_topic_proposal ───────────────────────────────────
export async function handleReviewTopicProposal(
  supabase: TypedClient,
  params: {
    topic_proposal_id: string;
    action: string;
    admin_notes?: string;
    create_topic?: boolean;
  },
): Promise<McpResult> {
  const status = params.action === "approve" ? "approved" : "rejected";
  const updateData: Record<string, unknown> = {
    status,
    reviewed_at: new Date().toISOString(),
  };
  if (params.admin_notes) updateData.admin_notes = params.admin_notes;

  const { data: updated, error: upErr } = await supabase
    .from("topic_proposals")
    .update(updateData)
    .eq("id", params.topic_proposal_id)
    .select("*")
    .single();
  if (upErr) return err(upErr.message);

  let createdTopic = null;
  let topic_creation_error: string | null = null;
  if (params.action === "approve" && params.create_topic && updated) {
    const { data: newTopic, error: insertErr } = await supabase
      .from("topics")
      .insert({
        title_en: updated.title_en,
        title_es: updated.title_es,
        description_en: updated.description_en,
        description_es: updated.description_es,
        is_active: true,
      })
      .select("*")
      .single();
    if (insertErr) topic_creation_error = insertErr.message;
    else createdTopic = newTopic;
  }

  console.error(`[audit] Reviewed topic proposal ${params.topic_proposal_id}: ${status}`);
  return ok({ ...updated, created_topic: createdTopic, ...(topic_creation_error ? { topic_creation_error } : {}) });
}

// ─── Registration ──────────────────────────────────────────────────
export function registerFeedbackTools(server: McpServer): void {
  server.tool(
    "learn_list_feedback",
    "List user feedback, optionally filtered by type",
    {
      type: z.enum(["bug", "feature", "content", "other"]).optional().describe("Filter by feedback type"),
      limit: z.number().int().min(1).max(200).optional().describe("Max results (default 50)"),
    },
    { readOnlyHint: true },
    async ({ type, limit }) => handleListFeedback(getSupabaseClient(), { type, limit }),
  );

  server.tool(
    "learn_delete_feedback",
    "Delete a feedback entry",
    { feedback_id: z.string().uuid().describe("Feedback UUID to delete") },
    { destructiveHint: true },
    async ({ feedback_id }) => handleDeleteFeedback(getSupabaseClient(), { feedback_id }),
  );

  server.tool(
    "learn_list_proposed_questions",
    "List community-proposed questions with category context",
    {
      status: z.enum(["pending", "approved", "rejected"]).optional().describe("Filter by status"),
      limit: z.number().int().min(1).max(200).optional().describe("Max results (default 50)"),
    },
    { readOnlyHint: true },
    async ({ status, limit }) => handleListProposedQuestions(getSupabaseClient(), { status, limit }),
  );

  server.tool(
    "learn_review_proposed_question",
    "Approve or reject a proposed question. Optionally promote approved questions to real questions.",
    {
      proposed_question_id: z.string().uuid().describe("Proposed question UUID"),
      action: z.enum(["approve", "reject"]).describe("Approve or reject"),
      admin_notes: z.string().optional().describe("Admin notes"),
      promote: z.boolean().optional().describe("If approving, also copy to questions table"),
    },
    async ({ proposed_question_id, action, admin_notes, promote }) =>
      handleReviewProposedQuestion(getSupabaseClient(), { proposed_question_id, action, admin_notes, promote }),
  );

  server.tool(
    "learn_list_topic_proposals",
    "List community-proposed topic ideas",
    {
      status: z.enum(["pending", "approved", "rejected"]).optional().describe("Filter by status"),
      limit: z.number().int().min(1).max(200).optional().describe("Max results (default 50)"),
    },
    { readOnlyHint: true },
    async ({ status, limit }) => handleListTopicProposals(getSupabaseClient(), { status, limit }),
  );

  server.tool(
    "learn_review_topic_proposal",
    "Approve or reject a topic proposal. Optionally create the topic on approval.",
    {
      topic_proposal_id: z.string().uuid().describe("Topic proposal UUID"),
      action: z.enum(["approve", "reject"]).describe("Approve or reject"),
      admin_notes: z.string().optional().describe("Admin notes"),
      create_topic: z.boolean().optional().describe("If approving, also create the topic"),
    },
    async ({ topic_proposal_id, action, admin_notes, create_topic }) =>
      handleReviewTopicProposal(getSupabaseClient(), { topic_proposal_id: topic_proposal_id as string, action, admin_notes, create_topic }),
  );
}
