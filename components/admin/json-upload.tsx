"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  type ImportSummary,
  type ImportTopic,
  importTopicJson,
  validateImportJson,
} from "@/lib/services/admin-import";

export function JsonUpload() {
  const [jsonText, setJsonText] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [parsed, setParsed] = useState<ImportTopic | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  const handleValidate = async () => {
    setError(null);
    setResult(null);
    try {
      const json = JSON.parse(jsonText);
      const s = await validateImportJson(json);
      setSummary(s);
      setParsed(s.errors.length === 0 ? json : null);
    } catch {
      setError("Invalid JSON syntax");
      setSummary(null);
      setParsed(null);
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setError(null);
    try {
      const res = await importTopicJson(parsed);
      setResult(
        `Imported ${res.questionsInserted} questions. Topic ID: ${res.topicId}`,
      );
      setJsonText("");
      setSummary(null);
      setParsed(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(ev.target?.result as string);
      setSummary(null);
      setParsed(null);
      setResult(null);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="text-sm"
        />
      </div>

      <Textarea
        value={jsonText}
        onChange={(e) => {
          setJsonText(e.target.value);
          setSummary(null);
          setParsed(null);
          setResult(null);
        }}
        rows={16}
        placeholder="Paste topic JSON here or upload a file..."
        className="font-mono text-xs"
      />

      <div className="flex gap-2">
        <Button onClick={handleValidate} disabled={!jsonText.trim()}>
          {t("common.submit")}
        </Button>
        {parsed && (
          <Button onClick={handleImport} disabled={importing}>
            {importing ? t("admin.importing") : t("admin.import")}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {result && <p className="text-sm text-green-600">{result}</p>}

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Validation Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Topic:</span> {summary.topicTitle}
            </p>
            <p className="text-sm">
              <span className="font-medium">Categories:</span>{" "}
              {summary.categoryCount}
            </p>
            <p className="text-sm">
              <span className="font-medium">Questions:</span>{" "}
              {summary.questionCount}
            </p>
            {summary.errors.length === 0 ? (
              <Badge variant="default">Valid</Badge>
            ) : (
              <div>
                <Badge variant="destructive">
                  {summary.errors.length} errors
                </Badge>
                <ul className="mt-2 space-y-1">
                  {summary.errors.map((err) => (
                    <li key={err} className="text-sm text-red-500">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
