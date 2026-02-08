"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TranslateDialog } from "@/components/admin/translate-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAutoTranslate } from "@/hooks/use-auto-translate";
import {
  createTopic,
  type TopicFormData,
  updateTopic,
} from "@/lib/services/admin-topics";

const topicSchema = z.object({
  title_en: z.string().min(1, "English title is required"),
  title_es: z.string().min(1, "Spanish title is required"),
  description_en: z.string().nullable(),
  description_es: z.string().nullable(),
  icon: z.string().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be hex color (#RRGGBB)")
    .nullable(),
  intro_text_en: z.string().nullable(),
  intro_text_es: z.string().nullable(),
  is_active: z.boolean(),
});

interface TopicFormProps {
  mode: "create" | "edit";
  topicId?: string;
  defaultValues?: TopicFormData;
}

const BILINGUAL_KEYS = [
  "title_en",
  "title_es",
  "description_en",
  "description_es",
  "intro_text_en",
  "intro_text_es",
] as const;

export function TopicForm({ mode, topicId, defaultValues }: TopicFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originalBilingual = useMemo(() => {
    const vals = defaultValues ?? {
      title_en: "",
      title_es: "",
      description_en: null,
      description_es: null,
      intro_text_en: null,
      intro_text_es: null,
    };
    const result: Record<string, unknown> = {};
    for (const key of BILINGUAL_KEYS) result[key] = vals[key];
    return result;
  }, [defaultValues]);

  const { interceptSave, dialogProps } = useAutoTranslate({
    originalValues: originalBilingual,
    errorMessage: t("admin.translate.error"),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TopicFormData>({
    resolver: zodResolver(topicSchema),
    defaultValues: defaultValues ?? {
      title_en: "",
      title_es: "",
      description_en: null,
      description_es: null,
      icon: null,
      color: null,
      intro_text_en: null,
      intro_text_es: null,
      is_active: true,
    },
  });

  const colorValue = watch("color");
  const isActive = watch("is_active");

  const onSubmit = async (data: TopicFormData) => {
    // Extract bilingual fields for translation check
    const bilingualValues: Record<string, unknown> = {};
    for (const key of BILINGUAL_KEYS) bilingualValues[key] = data[key];

    interceptSave(bilingualValues, async (finalBilingual) => {
      setSaving(true);
      setError(null);
      try {
        // Merge translated bilingual fields back into full form data
        const merged = { ...data };
        for (const key of BILINGUAL_KEYS) {
          if (key in finalBilingual) {
            (merged as Record<string, unknown>)[key] = finalBilingual[key];
          }
        }

        const normalized: TopicFormData = {
          ...merged,
          description_en: merged.description_en || null,
          description_es: merged.description_es || null,
          icon: merged.icon || null,
          color: merged.color || null,
          intro_text_en: merged.intro_text_en || null,
          intro_text_es: merged.intro_text_es || null,
        };

        if (mode === "create") {
          await createTopic(normalized);
        } else {
          await updateTopic(topicId!, normalized);
        }
        router.push("/admin/topics");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Titles */}
      <Tabs defaultValue="en">
        <TabsList>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="es">Spanish</TabsTrigger>
        </TabsList>

        <TabsContent value="en" className="space-y-4 mt-4">
          <div>
            <Label htmlFor="title_en">Title (EN)</Label>
            <Input id="title_en" {...register("title_en")} />
            {errors.title_en && (
              <p className="text-sm text-red-500 mt-1">
                {errors.title_en.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="description_en">Description (EN)</Label>
            <Textarea
              id="description_en"
              {...register("description_en")}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="intro_text_en">Intro Text (EN)</Label>
            <Textarea
              id="intro_text_en"
              {...register("intro_text_en")}
              rows={8}
              placeholder="Markdown supported"
            />
          </div>
        </TabsContent>

        <TabsContent value="es" className="space-y-4 mt-4">
          <div>
            <Label htmlFor="title_es">Title (ES)</Label>
            <Input id="title_es" {...register("title_es")} />
            {errors.title_es && (
              <p className="text-sm text-red-500 mt-1">
                {errors.title_es.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="description_es">Description (ES)</Label>
            <Textarea
              id="description_es"
              {...register("description_es")}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="intro_text_es">Intro Text (ES)</Label>
            <Textarea
              id="intro_text_es"
              {...register("intro_text_es")}
              rows={8}
              placeholder="Markdown supported"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="icon">Icon (emoji)</Label>
              <Input id="icon" {...register("icon")} placeholder="e.g. 💉" />
            </div>
            <div>
              <Label htmlFor="color">Color (hex)</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  {...register("color")}
                  placeholder="#a78bfa"
                  className="flex-1"
                />
                {colorValue && /^#[0-9a-fA-F]{6}$/.test(colorValue) && (
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: colorValue }}
                  />
                )}
              </div>
              {errors.color && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.color.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toggles */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active</Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(v) => setValue("is_active", v)}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving
            ? "Saving..."
            : mode === "create"
              ? "Create Topic"
              : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/topics")}
        >
          Cancel
        </Button>
      </div>

      <TranslateDialog {...dialogProps} />
    </form>
  );
}
