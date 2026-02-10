"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/server";

type AdminTable = "proposed_questions" | "topic_proposals";

// Generic status update — now uses requireAdmin's user for resolved_by/reviewed_by
async function updateStatus(
  table: AdminTable,
  id: string,
  status: string,
  adminNotes?: string,
) {
  const { supabase, user } = await requireAdmin();

  const updates: Record<string, unknown> = { status };
  if (adminNotes !== undefined) updates.admin_notes = adminNotes;
  if (
    status === "resolved" ||
    status === "dismissed" ||
    status === "approved" ||
    status === "rejected"
  ) {
    updates.resolved_at = new Date().toISOString();
    updates.reviewed_at = new Date().toISOString();
    updates.resolved_by = user.id;
    updates.reviewed_by = user.id;
  }

  const { error } = await supabase.from(table).update(updates).eq("id", id);
  if (error) throw new Error(error.message);
}

// Feedback
export async function getFeedbackList(type?: string) {
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (type) {
    query = query.eq("type", type);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// Proposed questions
export async function getProposedQuestionsList() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("proposed_questions")
    .select("*, category:categories(name_en, name_es)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProposedQuestionStatus(
  id: string,
  status: string,
  adminNotes?: string,
) {
  await updateStatus("proposed_questions", id, status, adminNotes);
  revalidatePath("/admin/reviews/proposed-questions");
}

// Topic proposals
export async function getTopicProposalsList() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("topic_proposals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTopicProposalStatus(
  id: string,
  status: string,
  adminNotes?: string,
) {
  await updateStatus("topic_proposals", id, status, adminNotes);
  revalidatePath("/admin/reviews/topic-proposals");
}

// Single question fetch (for inline editing)
export async function getQuestionById(id: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("questions")
    .select(
      "*, category:categories(id, name_en, topic_id, topic:topics(id, title_en))",
    )
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Questions CRUD
export async function getQuestionsList(filters?: {
  topicId?: string;
  categoryId?: string;
  type?: string;
  search?: string;
}) {
  const { supabase } = await requireAdmin();
  const selectStr = filters?.topicId
    ? "*, category:categories!inner(id, name_en, topic_id, topic:topics(id, title_en))"
    : "*, category:categories(id, name_en, topic_id, topic:topics(id, title_en))";

  let query = supabase
    .from("questions")
    .select(selectStr)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters?.topicId) {
    query = query.eq("categories.topic_id", filters.topicId);
  }
  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.search) {
    query = query.ilike("question_en", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateQuestion(
  id: string,
  updates: Record<string, unknown>,
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("questions")
    .update(updates)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/questions");
  revalidatePath("/admin/quizzes");
}

export async function deleteQuestion(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/questions");
  revalidatePath("/admin/quizzes");
}

export async function deleteFeedback(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("feedback").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reviews/bug-reports");
  revalidatePath("/admin/reviews/feature-requests");
  revalidatePath("/admin/reviews/content-issues");
  revalidatePath("/admin/reviews/other-feedback");
}

export async function deleteProposedQuestion(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("proposed_questions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reviews/proposed-questions");
}

export async function deleteTopicProposal(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("topic_proposals")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reviews/topic-proposals");
}

// Flashcard CRUD
export async function getFlashcardsList(filters?: {
  topicId?: string;
  categoryId?: string;
  search?: string;
}) {
  const { supabase } = await requireAdmin();
  const selectStr = filters?.topicId
    ? "*, category:categories!inner(id, name_en, topic_id, topic:topics(id, title_en))"
    : "*, category:categories(id, name_en, topic_id, topic:topics(id, title_en))";
  let query = supabase
    .from("flashcards")
    .select(selectStr)
    .order("created_at", { ascending: false })
    .limit(100);
  if (filters?.topicId)
    query = query.eq("categories.topic_id", filters.topicId);
  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters?.search)
    query = query.ilike("question_en", `%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getFlashcardById(id: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("flashcards")
    .select(
      "*, category:categories(id, name_en, topic_id, topic:topics(id, title_en))",
    )
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateFlashcard(
  id: string,
  updates: Record<string, unknown>,
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("flashcards")
    .update(updates)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/flashcards");
}

export async function deleteFlashcard(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("flashcards").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/flashcards");
}

// Lookup lists
export async function getTopicsList() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("topics")
    .select("id, title_en")
    .eq("is_active", true)
    .order("title_en");
  if (error) throw new Error(error.message);
  return data;
}

export async function getCategoriesList() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name_en, topic_id")
    .order("name_en");
  if (error) throw new Error(error.message);
  return data;
}
