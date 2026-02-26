"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function TopicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Topic error:", error);
  }, [error]);

  return (
    <div className="container max-w-lg mx-auto py-16 px-4">
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("somethingWentWrong")}</AlertTitle>
        <AlertDescription>{t("topicError")}</AlertDescription>
      </Alert>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={() => reset()}>
          {t("tryAgain")}
        </Button>
        <Button asChild>
          <Link href="/topics">{t("backToTopics")}</Link>
        </Button>
      </div>
    </div>
  );
}
