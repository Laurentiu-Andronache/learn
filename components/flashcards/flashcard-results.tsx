"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryBreakdown {
  name: string;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

interface FlashcardResultsProps {
  again: number;
  hard: number;
  good: number;
  easy: number;
  categories: CategoryBreakdown[];
  onReviewAgain?: () => void;
}

export function FlashcardResults({
  again,
  hard,
  good,
  easy,
  categories,
  onReviewAgain,
}: FlashcardResultsProps) {
  const t = useTranslations("flashcard.results");

  const total = again + hard + good + easy;
  const recallPercent =
    total > 0 ? Math.round(((good + easy) / total) * 100) : 0;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-center">{t("title")}</h1>

      {/* Score card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-5xl font-bold">{recallPercent}%</p>
            <p className="text-sm text-muted-foreground">{t("recallRate")}</p>
          </div>

          {/* 4-segment colored bar */}
          {total > 0 && (
            <div className="flex h-3 rounded-full overflow-hidden">
              {again > 0 && (
                <div
                  className="bg-red-500"
                  style={{ width: `${(again / total) * 100}%` }}
                />
              )}
              {hard > 0 && (
                <div
                  className="bg-amber-500"
                  style={{ width: `${(hard / total) * 100}%` }}
                />
              )}
              {good > 0 && (
                <div
                  className="bg-green-500"
                  style={{ width: `${(good / total) * 100}%` }}
                />
              )}
              {easy > 0 && (
                <div
                  className="bg-blue-500"
                  style={{ width: `${(easy / total) * 100}%` }}
                />
              )}
            </div>
          )}

          {/* 4-rating counts */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-semibold text-red-500">{again}</p>
              <p className="text-xs text-muted-foreground">{t("again")}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-amber-500">{hard}</p>
              <p className="text-xs text-muted-foreground">{t("hard")}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-green-500">{good}</p>
              <p className="text-xs text-muted-foreground">{t("good")}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-500">{easy}</p>
              <p className="text-xs text-muted-foreground">{t("easy")}</p>
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
              const catTotal = cat.again + cat.hard + cat.good + cat.easy;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{cat.name}</span>
                    <span className="text-muted-foreground">
                      {cat.good + cat.easy}/{catTotal}
                    </span>
                  </div>
                  {catTotal > 0 && (
                    <div className="flex h-1.5 rounded-full overflow-hidden">
                      {cat.again > 0 && (
                        <div
                          className="bg-red-500"
                          style={{ width: `${(cat.again / catTotal) * 100}%` }}
                        />
                      )}
                      {cat.hard > 0 && (
                        <div
                          className="bg-amber-500"
                          style={{ width: `${(cat.hard / catTotal) * 100}%` }}
                        />
                      )}
                      {cat.good > 0 && (
                        <div
                          className="bg-green-500"
                          style={{ width: `${(cat.good / catTotal) * 100}%` }}
                        />
                      )}
                      {cat.easy > 0 && (
                        <div
                          className="bg-blue-500"
                          style={{ width: `${(cat.easy / catTotal) * 100}%` }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {onReviewAgain && (
          <Button onClick={onReviewAgain} className="w-full" size="lg">
            <RotateCcw size={16} />
            {t("reviewAgain")}
          </Button>
        )}
        <Button variant="outline" asChild className="w-full" size="lg">
          <Link href="/topics">
            <ArrowLeft size={16} />
            {t("backToTopics")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
