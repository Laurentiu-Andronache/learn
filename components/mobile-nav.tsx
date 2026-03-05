"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MobileNav({
  isLoggedIn,
  isAdmin,
  isAnonymous,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isAnonymous: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t("menu")}
      >
        <Menu size={20} />
      </Button>
      <SheetContent side="right" className="w-64">
        <SheetHeader>
          <SheetTitle className="text-left">LEARN</SheetTitle>
          <SheetDescription className="sr-only">
            Navigation menu
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {isLoggedIn ? (
            <>
              <Link
                href="/topics"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                {t("topics")}
              </Link>
              <Link
                href="/import"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                {t("import")}
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                {t("settings")}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {t("admin")}
                </Link>
              )}
              {isAnonymous && (
                <Link
                  href="/auth/upgrade"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t("saveProgress")}
                </Link>
              )}
              <div className="mt-2 border-t pt-2 px-3">
                <LogoutButton variant={isAnonymous ? "ghost" : "default"} />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                {t("login")}
              </Link>
              <Link
                href="/auth/sign-up"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                {t("signUp")}
              </Link>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
