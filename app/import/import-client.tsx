"use client";

import { AlertTriangle, FileUp, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImportPreview } from "./import-preview";
import { ImportResult } from "./import-result";
import { useImportState } from "./use-import-state";

export function ImportClient({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("import");

  const {
    state,
    file,
    language,
    makePublic,
    autoTranslate,
    dragOver,
    importStep,
    result,
    error,
    preview,
    locale,
    targetLang,
    targetLangEs,
    fileInputRef,
    setLanguage,
    setMakePublic,
    setAutoTranslate,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
    startImport,
    resetForm,
  } = useImportState();

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
        <ImportPreview
          preview={preview}
          onReset={resetForm}
          onConfirm={startImport}
        />
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
        <ImportResult result={result} onReset={resetForm} />
      )}
    </div>
  );
}
