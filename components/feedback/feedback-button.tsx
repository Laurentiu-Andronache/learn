"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "./feedback-modal";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isStudyPage = /\/topics\/[^/]+\/(quiz|flashcards|reading)/.test(pathname);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
      >
        Feedback
      </Button>
      <FeedbackModal open={open} onOpenChange={setOpen} defaultType={isStudyPage ? "content" : "bug"} />
    </>
  );
}
