import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FlashcardsLoading() {
  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-8" />
      </div>
      <Card className="min-h-[300px]">
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-4 w-20 mx-auto" />
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </CardContent>
      </Card>
      <div className="flex justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <Skeleton key={i} className="h-10 w-20 rounded-md" />
        ))}
      </div>
    </div>
  );
}
