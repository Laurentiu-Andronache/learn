import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ImportClient } from "@/app/import/import-client";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return {
    title:
      locale === "es"
        ? "Importar Mazo de Anki - LEARN"
        : "Import Anki Deck - LEARN",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  let isAdmin = false;
  if (user.email) {
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();
    isAdmin = !!admin;
  }

  return <ImportClient isAdmin={isAdmin} />;
}
