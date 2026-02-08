"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  is_builtin: z.boolean(),
});

interface TopicFormProps {
  mode: "create" | "edit";
  topicId?: string;
  defaultValues?: TopicFormData;
}

export function TopicForm({ mode, topicId, defaultValues }: TopicFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      is_builtin: false,
    },
  });

  const colorValue = watch("color");
  const isActive = watch("is_active");
  const isBuiltin = watch("is_builtin");

  const onSubmit = async (data: TopicFormData) => {
    setSaving(true);
    setError(null);
    try {
      // Normalize empty strings to null
      const normalized: TopicFormData = {
        ...data,
        description_en: data.description_en || null,
        description_es: data.description_es || null,
        icon: data.icon || null,
        color: data.color || null,
        intro_text_en: data.intro_text_en || null,
        intro_text_es: data.intro_text_es || null,
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
          <div className="flex items-center justify-between">
            <Label htmlFor="is_builtin">Built-in</Label>
            <Switch
              id="is_builtin"
              checked={isBuiltin}
              onCheckedChange={(v) => setValue("is_builtin", v)}
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
    </form>
  );
}
