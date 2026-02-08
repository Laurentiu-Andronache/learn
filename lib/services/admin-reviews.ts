"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Generic status update
async function updateStatus(
  table: string,
  id: string,
  status: string,
  adminNotes?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    if (user) {
      updates.resolved_by = user.id;
      updates.reviewed_by = user.id;
    }
  }

  const { error } = await supabase.from(table).update(updates).eq("id", id);
  if (error) throw new Error(error.message);
}

// Feedback
export async function getFeedbackList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Question reports
export async function getReportsList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_reports")
    .select("*, question:questions(question_en, question_es)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateReportStatus(
  id: string,
  status: string,
  adminNotes?: string,
) {
  await updateStatus("question_reports", id, status, adminNotes);
  revalidatePath("/admin/reviews/reports");
}

// Proposed questions
export async function getProposedQuestionsList() {
  const supabase = await createClient();
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

// Theme proposals
export async function getThemeProposalsList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("theme_proposals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateThemeProposalStatus(
  id: string,
  status: string,
  adminNotes?: string,
) {
  await updateStatus("theme_proposals", id, status, adminNotes);
  revalidatePath("/admin/reviews/theme-proposals");
}

// Questions CRUD
export async function getQuestionsList(filters?: {
  themeId?: string;
  categoryId?: string;
  type?: string;
  search?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("questions")
    .select(
      "*, category:categories(id, name_en, theme_id, theme:themes(id, title_en))",
    )
    .order("created_at", { ascending: false })
    .limit(100);

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

  // Filter by theme if needed (through category join)
  if (filters?.themeId) {
    return (data || []).filter(
      (q: { category?: { theme_id?: string } }) =>
        q.category?.theme_id === filters.themeId,
    );
  }
  return data || [];
}

export async function updateQuestion(
  id: string,
  updates: Record<string, unknown>,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("questions")
    .update(updates)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/questions");
}

export async function deleteQuestion(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/questions");
}
