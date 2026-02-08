import { JsonUpload } from "@/components/admin/json-upload";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Import Topic from JSON</h1>
      <p className="text-muted-foreground">
        Upload a JSON file containing a complete topic with categories and
        questions.
      </p>
      <JsonUpload />
    </div>
  );
}
