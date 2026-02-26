import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TopicDetailLoading() {
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-center gap-3 mt-2">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
              <div key={i} className="text-center space-y-1">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="sm:col-span-2">
          <CardContent className="pt-6 text-center space-y-2">
            <Skeleton className="h-10 w-10 mx-auto rounded" />
            <Skeleton className="h-5 w-24 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <Skeleton className="h-8 w-8 mx-auto rounded" />
            <Skeleton className="h-5 w-28 mx-auto" />
            <Skeleton className="h-4 w-40 mx-auto" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <Skeleton className="h-8 w-8 mx-auto rounded" />
            <Skeleton className="h-5 w-20 mx-auto" />
            <Skeleton className="h-4 w-36 mx-auto" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
