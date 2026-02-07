import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>LEARN — Science-backed learning</p>
        <div className="flex gap-4">
          <Link
            href="/about"
            className="hover:text-foreground transition-colors"
          >
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}
