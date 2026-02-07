import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSuspendedQuestions, getHiddenThemes } from "@/lib/services/user-preferences";
import { SettingsClient } from "@/components/settings/settings-client";

export const metadata = { title: "Settings - LEARN" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const isAnonymous = user.is_anonymous ?? false;

  const [profile, suspendedQuestions, hiddenThemes] = await Promise.all([
    getProfile(user.id).catch(() => null),
    getSuspendedQuestions(user.id).catch(() => []),
    getHiddenThemes(user.id).catch(() => []),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (
    <SettingsClient
      userId={user.id}
      email={user.email ?? null}
      isAnonymous={isAnonymous}
      createdAt={user.created_at}
      profile={profile}
      suspendedQuestions={suspendedQuestions as any}
      hiddenThemes={hiddenThemes as any}
    />
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
