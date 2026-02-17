import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { SettingsClient } from "@/components/settings/settings-client";
import {
  getBaseFontSize,
  getFsrsSettings,
  getHiddenTopics,
  getProfile,
  getSuspendedFlashcards,
  updateBaseFontSize,
} from "@/lib/services/user-preferences";
import { countValidOptimizerItems } from "@/lib/fsrs/optimizer";
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

  const cookieStore = await cookies();
  const cookieFont = parseInt(
    cookieStore.get("base_font_size")?.value || "0",
    10,
  );
  const validCookieFont =
    cookieFont >= 12 && cookieFont <= 18 ? cookieFont : null;

  const [profile, suspendedFlashcards, hiddenTopics, fsrsSettings, dbFontSize, reviewCountResult] =
    await Promise.all([
      getProfile(user.id).catch(() => null),
      getSuspendedFlashcards(user.id).catch(() => []),
      getHiddenTopics(user.id).catch(() => []),
      getFsrsSettings(user.id).catch(() => null),
      getBaseFontSize(user.id).catch(() => 14),
      countValidOptimizerItems(user.id).catch(() => 0),
    ]);

  // Cookie is the source of truth (works without DB); sync to DB if they differ
  const baseFontSize = validCookieFont ?? dbFontSize;
  if (validCookieFont && validCookieFont !== dbFontSize) {
    updateBaseFontSize(user.id, validCookieFont).catch(() => {});
  }

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
      reviewCount={reviewCountResult}
      baseFontSize={baseFontSize}
    />
  );
}
