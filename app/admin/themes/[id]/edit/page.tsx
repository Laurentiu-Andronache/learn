import { getThemeById } from "@/lib/services/admin-themes";
import { ThemeForm } from "@/components/admin/theme-form";
import { notFound } from "next/navigation";

export default async function EditThemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let theme;
  try {
    theme = await getThemeById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Theme</h1>
      <ThemeForm
        mode="edit"
        themeId={id}
        defaultValues={{
          title_en: theme.title_en,
          title_es: theme.title_es,
          description_en: theme.description_en,
          description_es: theme.description_es,
          icon: theme.icon,
          color: theme.color,
          intro_text_en: theme.intro_text_en,
          intro_text_es: theme.intro_text_es,
          is_active: theme.is_active ?? true,
          is_builtin: theme.is_builtin ?? false,
        }}
      />
    </div>
  );
}
