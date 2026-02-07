"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ThemeFormData {
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

export async function createTheme(data: ThemeFormData) {
  const supabase = await createClient();
  const { data: theme, error } = await supabase
    .from("themes")
    .insert(data)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/themes");
  return theme.id;
}

export async function updateTheme(id: string, data: ThemeFormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("themes").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/themes");
  revalidatePath(`/admin/themes/${id}/edit`);
}

export async function softDeleteTheme(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("themes")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/themes");
}

export async function restoreTheme(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("themes")
    .update({ is_active: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/themes");
}

export async function getThemeById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("themes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getAllThemes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("themes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
