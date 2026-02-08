"use client";

import {
  AlertTriangle,
  BookX,
  Eye,
  Settings,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HiddenTopicsList } from "./hidden-topics-list";
import { ProfileEditor } from "./profile-editor";
import { SuspendedFlashcardsList } from "./suspended-flashcards-list";

interface SettingsClientProps {
  userId: string;
  email: string | null;
  isAnonymous: boolean;
  createdAt: string;
  profile: {
    display_name: string | null;
    preferred_language: string;
  } | null;
  suspendedFlashcards: Array<{
    id: string;
    reason: string | null;
    suspended_at: string;
    flashcard: {
      id: string;
      question_en: string;
      question_es: string;
      category: { name_en: string; name_es: string } | null;
    } | null;
  }>;
  hiddenTopics: Array<{
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
  suspendedFlashcards,
  hiddenTopics,
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
            {email && <p className="text-sm text-muted-foreground">{email}</p>}
            <p className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Suspended Flashcards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookX size={18} />
            {t("suspendedQuestions")}
          </CardTitle>
          <CardDescription>
            {suspendedFlashcards.length === 0
              ? t("noSuspended")
              : `${suspendedFlashcards.length} ${t("suspendedQuestions").toLowerCase()}`}
          </CardDescription>
        </CardHeader>
        {suspendedFlashcards.length > 0 && (
          <CardContent>
            <SuspendedFlashcardsList
              userId={userId}
              items={suspendedFlashcards}
            />
          </CardContent>
        )}
      </Card>

      {/* Hidden Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} />
            {t("hiddenTopics")}
          </CardTitle>
          <CardDescription>
            {hiddenTopics.length === 0
              ? t("noHidden")
              : `${hiddenTopics.length} ${hiddenTopics.length === 1 ? "topic" : "topics"}`}
          </CardDescription>
        </CardHeader>
        {hiddenTopics.length > 0 && (
          <CardContent>
            <HiddenTopicsList userId={userId} items={hiddenTopics} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
