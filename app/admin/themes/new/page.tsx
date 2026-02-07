import { ThemeForm } from "@/components/admin/theme-form";

export default function NewThemePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create New Theme</h1>
      <ThemeForm mode="create" />
    </div>
  );
}
