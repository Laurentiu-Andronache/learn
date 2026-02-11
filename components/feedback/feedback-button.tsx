"use client";

import { MessageSquarePlus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { FeedbackModal } from "./feedback-modal";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const pathname = usePathname();
  const isStudyPage = /\/topics\/[^/]+\/(quiz|flashcards|reading)/.test(
    pathname,
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthenticated(!!user);
    });
  }, []);

  if (!authenticated) return null;

  return (
    <>
      {/* Desktop: text button */}
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg hidden sm:inline-flex"
      >
        Feedback
      </Button>
      {/* Mobile: compact icon */}
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="icon-sm"
        className="fixed bottom-3 right-3 z-50 rounded-full shadow-lg sm:hidden"
      >
        <MessageSquarePlus className="size-4" />
      </Button>
      <FeedbackModal
        open={open}
        onOpenChange={setOpen}
        defaultType={isStudyPage ? "content" : "bug"}
      />
    </>
  );
}
