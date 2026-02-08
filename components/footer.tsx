import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function Footer() {
  const tNav = await getTranslations("nav");
  const tFooter = await getTranslations("footer");

  return (
    <footer className="border-t py-6">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground pr-28">
        <p className="ml-4">LEARN — {tFooter("tagline")}</p>
        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className="hover:text-foreground transition-colors"
          >
            {tNav("about")}
          </Link>
          <a
            href="https://launcher.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Launcher
          </a>
          <a
            href="https://x.com/laur_Science"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
            aria-label="X (Twitter)"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
