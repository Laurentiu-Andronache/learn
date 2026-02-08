"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/services/user-preferences";

interface ProfileEditorProps {
  userId: string;
  displayName: string;
}

export function ProfileEditor({
  userId,
  displayName: initial,
}: ProfileEditorProps) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setSaved(false);
    startTransition(async () => {
      await updateProfile(userId, { display_name: name || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const dirty = name !== initial;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="display-name">{t("displayName")}</Label>
      <div className="flex gap-2">
        <Input
          id="display-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("displayName")}
          className="flex-1"
        />
        <Button size="sm" onClick={handleSave} disabled={!dirty || isPending}>
          {isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <Check size={14} />
          ) : (
            tCommon("save")
          )}
        </Button>
      </div>
    </div>
  );
}
