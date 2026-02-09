import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { SettingsClient } from "@/components/settings/settings-client";
import {
  getFsrsSettings,
  getHiddenTopics,
  getProfile,
  getSuspendedFlashcards,
} from "@/lib/services/user-preferences";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return {
    title: locale === "es" ? "Configuración - LEARN" : "Settings - LEARN",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const isAnonymous = user.is_anonymous ?? false;

  const [profile, suspendedFlashcards, hiddenTopics, fsrsSettings] =
    await Promise.all([
      getProfile(user.id).catch(() => null),
      getSuspendedFlashcards(user.id).catch(() => []),
      getHiddenTopics(user.id).catch(() => []),
      getFsrsSettings(user.id).catch(() => null),
    ]);

  return (
    <SettingsClient
      userId={user.id}
      email={user.email ?? null}
      isAnonymous={isAnonymous}
      createdAt={user.created_at}
      profile={profile}
      suspendedFlashcards={suspendedFlashcards}
      hiddenTopics={hiddenTopics}
      fsrsSettings={fsrsSettings}
    />
  );
}
