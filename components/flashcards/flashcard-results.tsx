"use client";

import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface FlashcardResultsProps {
  knew: number;
  didntKnow: number;
  categories: Array<{ name: string; knew: number; didntKnow: number }>;
  onReviewDidntKnow?: () => void;
}

export function FlashcardResults({
  knew,
  didntKnow,
  categories,
  onReviewDidntKnow,
}: FlashcardResultsProps) {
  const tResults = useTranslations("flashcard.results");

  const total = knew + didntKnow;
  const knewPercent = total > 0 ? Math.round((knew / total) * 100) : 0;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-center">{tResults("title")}</h1>

      {/* Score card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-5xl font-bold">{knewPercent}%</p>
            <Progress value={knewPercent} className="h-3" />
          </div>

          <div className="flex justify-center gap-8 pt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-600" />
              <div>
                <p className="text-lg font-semibold text-green-600">{knew}</p>
                <p className="text-xs text-muted-foreground">
                  {tResults("knew")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <XCircle size={18} className="text-red-600" />
              <div>
                <p className="text-lg font-semibold text-red-600">
                  {didntKnow}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tResults("didntKnow")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category breakdown */}
      {categories.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((cat) => {
              const catTotal = cat.knew + cat.didntKnow;
              const catPercent =
                catTotal > 0 ? Math.round((cat.knew / catTotal) * 100) : 0;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{cat.name}</span>
                    <span className="text-muted-foreground">
                      {cat.knew}/{catTotal}
                    </span>
                  </div>
                  <Progress value={catPercent} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {onReviewDidntKnow && (
          <Button onClick={onReviewDidntKnow} className="w-full" size="lg">
            <RotateCcw size={16} />
            {tResults("reviewDidntKnow")}
          </Button>
        )}
        <Button variant="outline" asChild className="w-full" size="lg">
          <Link href="/topics">
            <ArrowLeft size={16} />
            {tResults("backToTopics")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
