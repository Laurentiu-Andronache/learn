"use client";

import { AlertTriangle, Check } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ImportResultData } from "./use-import-state";

interface ImportResultProps {
  result: ImportResultData;
  onReset: () => void;
}

export function ImportResult({ result, onReset }: ImportResultProps) {
  const t = useTranslations("import");

  return (
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
        <Button variant="outline" onClick={onReset} className="flex-1">
          {t("importAnother")}
        </Button>
        <Button asChild className="flex-1">
          <Link href={`/topics/${result.topicId}`}>{t("viewTopic")}</Link>
        </Button>
      </div>
    </div>
  );
}
