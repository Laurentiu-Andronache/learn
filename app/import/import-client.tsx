"use client";

import {
  AlertTriangle,
  Check,
  FileUp,
  Loader2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IMPORT_LIMITS } from "@/lib/import/anki-types";

type ImportState = "upload" | "preview" | "importing" | "result";

interface PreviewData {
  deckName: string;
  cardCount: number;
  mediaCount: number;
  categoryCount: number;
}

interface ImportResult {
  topicId: string;
  flashcardsImported: number;
  mediaUploaded: number;
  warnings: string[];
}

export function ImportClient({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("import");
  const locale = useLocale();

  const [state, setState] = useState<ImportState>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<"en" | "es">(
    locale === "es" ? "es" : "en",
  );
  const [makePublic, setMakePublic] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importStep, setImportStep] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetLang = language === "en" ? "Spanish" : "English";
  const targetLangEs = language === "en" ? "español" : "inglés";

  const validateFile = useCallback(
    (f: File): string | null => {
      if (f.size > IMPORT_LIMITS.maxFileSize) {
        return t("fileTooLarge");
      }
      const ext = f.name.toLowerCase();
      if (!ext.endsWith(".apkg") && !ext.endsWith(".zip")) {
        return t("invalidFormat");
      }
      return null;
    },
    [t],
  );

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        toast.error(err);
        return;
      }
      setFile(f);
      setError(null);
      setResult(null);
    },
    [validateFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        handleFile(selected);
      }
    },
    [handleFile],
  );

  const startImport = useCallback(async () => {
    if (!file) return;

    setState("importing");
    setError(null);
    setImportStep(t("processing"));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);
      formData.append("visibility", makePublic ? "public" : "private");
      formData.append("autoTranslate", String(autoTranslate));

      const response = await fetch("/api/import/anki", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || t("error");
        if (response.status === 429) {
          setError(t("rateLimited"));
        } else {
          setError(errorMsg);
        }
        setState("upload");
        return;
      }

      setResult({
        topicId: data.topicId,
        flashcardsImported: data.flashcardsImported,
        mediaUploaded: data.mediaUploaded,
        warnings: data.warnings || [],
      });
      setState("result");
    } catch {
      setError(t("error"));
      setState("upload");
    }
  }, [file, language, makePublic, autoTranslate, t]);

  const resetForm = useCallback(() => {
    setState("upload");
    setFile(null);
    setError(null);
    setResult(null);
    setPreview(null);
    setImportStep("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      {/* Upload State */}
      {state === "upload" && (
        <div className="space-y-6">
          {/* Drop Zone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : file
                  ? "border-primary/50 bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".apkg,.zip"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              {file ? (
                <>
                  <FileUp className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t("dropzone")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("dropzoneHint")}
                    </p>
                  </div>
                </>
              )}
            </div>
          </button>

          {/* Options */}
          <Card>
            <CardContent className="pt-6 space-y-5">
              {/* Language Selector */}
              <div className="space-y-2">
                <Label htmlFor="language-select">{t("selectLanguage")}</Label>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as "en" | "es")}
                >
                  <SelectTrigger id="language-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("languageHint")}
                </p>
              </div>

              {/* Admin-only options */}
              {isAdmin && (
                <>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="make-public"
                      checked={makePublic}
                      onCheckedChange={(checked) =>
                        setMakePublic(checked === true)
                      }
                    />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="make-public"
                        className="text-sm font-medium cursor-pointer"
                      >
                        {t("makePublic")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("makePublicHint")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="auto-translate"
                      checked={autoTranslate}
                      onCheckedChange={(checked) =>
                        setAutoTranslate(checked === true)
                      }
                    />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="auto-translate"
                        className="text-sm font-medium cursor-pointer"
                      >
                        {t("autoTranslate", {
                          targetLang:
                            locale === "es" ? targetLangEs : targetLang,
                        })}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("autoTranslateHint")}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Import Button */}
          <Button
            onClick={startImport}
            disabled={!file}
            className="w-full"
            size="lg"
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("confirm")}
          </Button>
        </div>
      )}

      {/* Preview State */}
      {state === "preview" && preview && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("preview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("deckName")}</span>
                <span className="font-medium">{preview.deckName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("cardCount", { count: preview.cardCount })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("mediaCount", { count: preview.mediaCount })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("categoryCount", { count: preview.categoryCount })}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={resetForm} className="flex-1">
              {t("importAnother")}
            </Button>
            <Button onClick={startImport} className="flex-1">
              {t("confirm")}
            </Button>
          </div>
        </div>
      )}

      {/* Importing State */}
      {state === "importing" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">{t("importing")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {importStep}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result State */}
      {state === "result" && result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>{t("success")}</CardTitle>
                  <CardDescription>
                    {t("flashcardsImported", {
                      count: result.flashcardsImported,
                    })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {t("flashcardsImported", {
                    count: result.flashcardsImported,
                  })}
                </Badge>
                {result.mediaUploaded > 0 && (
                  <Badge variant="secondary">
                    {t("mediaUploaded", { count: result.mediaUploaded })}
                  </Badge>
                )}
              </div>

              {result.warnings.length > 0 && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-50/50 p-3 dark:bg-yellow-900/10">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      {t("warnings")}
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {result.warnings.map((warning) => (
                      <li
                        key={warning}
                        className="text-xs text-yellow-700 dark:text-yellow-400"
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={resetForm} className="flex-1">
              {t("importAnother")}
            </Button>
            <Button asChild className="flex-1">
              <Link href={`/topics/${result.topicId}`}>{t("viewTopic")}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
