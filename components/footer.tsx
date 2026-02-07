import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function Footer() {
  const tNav = await getTranslations("nav");
  const tFooter = await getTranslations("footer");

  return (
    <footer className="border-t py-6">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground pr-28">
        <p>LEARN — {tFooter("tagline")}</p>
        <div className="flex gap-4">
          <Link
            href="/about"
            className="hover:text-foreground transition-colors"
          >
            {tNav("about")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
