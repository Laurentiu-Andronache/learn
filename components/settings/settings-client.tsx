"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ProfileEditor } from "./profile-editor";
import { SuspendedQuestionsList } from "./suspended-questions-list";
import { HiddenThemesList } from "./hidden-themes-list";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Settings, User, Eye, BookX, Shield } from "lucide-react";
import Link from "next/link";

interface SettingsClientProps {
  userId: string;
  email: string | null;
  isAnonymous: boolean;
  createdAt: string;
  profile: {
    display_name: string | null;
    preferred_language: string;
  } | null;
  suspendedQuestions: Array<{
    id: string;
    reason: string | null;
    suspended_at: string;
    question: {
      id: string;
      question_en: string;
      question_es: string;
      category: { name_en: string; name_es: string } | null;
    } | null;
  }>;
  hiddenThemes: Array<{
    id: string;
    hidden_at: string;
    theme: {
      id: string;
      title_en: string;
      title_es: string;
      icon: string | null;
      color: string | null;
    } | null;
  }>;
}

export function SettingsClient({
  userId,
  email,
  isAnonymous,
  createdAt,
  profile,
  suspendedQuestions,
  hiddenThemes,
}: SettingsClientProps) {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 py-8 px-4">
      <div className="flex items-center gap-3">
        <Settings size={24} />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      {/* Upgrade prompt for anonymous users */}
      {isAnonymous && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle size={20} className="text-amber-500 shrink-0" />
            <p className="text-sm flex-1">{t("upgradePrompt")}</p>
            <Button asChild size="sm">
              <Link href="/auth/upgrade">{tAuth("upgradeTitle")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye size={18} />
            {t("language")} & {t("theme")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("language")}</span>
            <LanguageSwitcher />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("theme")}</span>
            <ThemeSwitcher />
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={18} />
            {t("profile")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProfileEditor
            userId={userId}
            displayName={profile?.display_name ?? ""}
          />
          <Separator />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("account")}</span>
            {email && (
              <p className="text-sm text-muted-foreground">{email}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Suspended Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookX size={18} />
            {t("suspendedQuestions")}
          </CardTitle>
          <CardDescription>
            {suspendedQuestions.length === 0
              ? t("noSuspended")
              : `${suspendedQuestions.length} ${suspendedQuestions.length === 1 ? "question" : "questions"}`}
          </CardDescription>
        </CardHeader>
        {suspendedQuestions.length > 0 && (
          <CardContent>
            <SuspendedQuestionsList userId={userId} items={suspendedQuestions} />
          </CardContent>
        )}
      </Card>

      {/* Hidden Themes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} />
            {t("hiddenThemes")}
          </CardTitle>
          <CardDescription>
            {hiddenThemes.length === 0
              ? t("noHidden")
              : `${hiddenThemes.length} ${hiddenThemes.length === 1 ? "theme" : "themes"}`}
          </CardDescription>
        </CardHeader>
        {hiddenThemes.length > 0 && (
          <CardContent>
            <HiddenThemesList userId={userId} items={hiddenThemes} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
