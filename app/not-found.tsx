import { Search } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="container max-w-lg mx-auto py-16 px-4 text-center">
      <Search className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
      <h1 className="text-3xl font-bold mb-2">{t("notFound")}</h1>
      <p className="text-muted-foreground mb-6">{t("notFoundDescription")}</p>
      <Button asChild>
        <Link href="/topics">{t("goHome")}</Link>
      </Button>
    </div>
  );
}
