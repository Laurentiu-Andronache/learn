"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/server";

export interface TopicFormData {
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  icon: string | null;
  color: string | null;
  intro_text_en: string | null;
  intro_text_es: string | null;
  is_active: boolean;
  is_builtin: boolean;
}

export async function createTopic(data: TopicFormData) {
  const { supabase } = await requireAdmin();
  const { data: topic, error } = await supabase
    .from("themes")
    .insert(data)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/topics");
  return topic.id;
}

export async function updateTopic(id: string, data: TopicFormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("themes").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/topics");
  revalidatePath(`/admin/topics/${id}/edit`);
}

export async function softDeleteTopic(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("themes")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/topics");
}

export async function restoreTopic(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("themes")
    .update({ is_active: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/topics");
}

export async function getTopicById(id: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("themes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTopicIntroText(
  id: string,
  introTextEn: string | null,
  introTextEs: string | null,
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("themes")
    .update({ intro_text_en: introTextEn, intro_text_es: introTextEs })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/topics");
  revalidatePath(`/admin/topics/${id}/edit`);
  revalidatePath("/admin/reviews/content-issues");
}

export async function getAllTopics() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("themes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
