import { getAllThemes } from "@/lib/services/admin-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AdminThemeActions } from "@/components/admin/theme-actions";

export default async function AdminThemesPage() {
  const themes = await getAllThemes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Themes</h1>
        <Button asChild>
          <Link href="/admin/themes/new">New Theme</Link>
        </Button>
      </div>

      <div className="space-y-3">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              {theme.icon && <span className="text-xl">{theme.icon}</span>}
              {theme.color && (
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: theme.color }}
                />
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">{theme.title_en}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {theme.title_es}
                </p>
              </div>
              <div className="flex gap-1.5">
                {!theme.is_active && <Badge variant="secondary">Inactive</Badge>}
                {theme.is_builtin && <Badge variant="outline">Built-in</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/themes/${theme.id}/edit`}>Edit</Link>
              </Button>
              <AdminThemeActions themeId={theme.id} isActive={theme.is_active ?? true} />
            </div>
          </div>
        ))}
        {themes.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No themes yet. Create your first theme.
          </p>
        )}
      </div>
    </div>
  );
}
