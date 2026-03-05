import { after } from "next/server";
import type { AnkiImportOptions } from "@/lib/import/anki-types";
import { IMPORT_LIMITS } from "@/lib/import/anki-types";
import { importAnkiFile } from "@/lib/import/import-orchestrator";
import { createRateLimiter } from "@/lib/rate-limit";
import { checkIsAdmin, createApiClient } from "@/lib/supabase/server";

const isRateLimited = createRateLimiter(
  IMPORT_LIMITS.importsPerHourPerUser,
  60 * 60 * 1000,
);

export const maxDuration = 60; // Vercel Pro plan limit

export async function POST(request: Request) {
  const supabase = await createApiClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.is_anonymous) {
    return Response.json(
      { error: "You must create an account to import decks." },
      { status: 401 },
    );
  }

  if (isRateLimited(user.id)) {
    return Response.json({ error: "Rate limited" }, { status: 429 });
  }

  const isAdmin = await checkIsAdmin(supabase, user.email);

  if (!isAdmin) {
    return Response.json(
      {
        error:
          "Importing decks is disabled temporarily, only working for admins.",
      },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error("formData parse error:", err);
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file size
  if (file.size > IMPORT_LIMITS.maxFileSize) {
    return Response.json(
      {
        error: `File too large (max ${IMPORT_LIMITS.maxFileSize / 1024 / 1024}MB)`,
      },
      { status: 400 },
    );
  }

  // Validate file extension
  const name = file.name.toLowerCase();
  if (!name.endsWith(".apkg") && !name.endsWith(".zip")) {
    return Response.json(
      { error: "Invalid file format. Please upload an .apkg or .zip file." },
      { status: 400 },
    );
  }

  const language = (formData.get("language") as string) || "en";
  if (language !== "en" && language !== "es") {
    return Response.json({ error: "Invalid language" }, { status: 400 });
  }

  const visibilityParam = formData.get("visibility") as string;
  const autoTranslateParam = formData.get("autoTranslate") as string;

  // Only admins can create public topics or auto-translate
  const visibility =
    isAdmin && visibilityParam === "public" ? "public" : "private";
  const autoTranslate = isAdmin && autoTranslateParam === "true";

  const options: AnkiImportOptions = {
    language: language as "en" | "es",
    visibility,
    autoTranslate,
    userId: user.id,
    isAdmin,
  };

  try {
    const buffer = await file.arrayBuffer();
    const result = await importAnkiFile(buffer, options);

    // If admin requested auto-translate, fire in background
    if (autoTranslate && result.topicId) {
      after(async () => {
        try {
          const { translateTopicContent } = await import(
            "@/lib/import/anki-translate"
          );
          const warnings = await translateTopicContent(
            result.topicId,
            language as "en" | "es",
          );
          if (warnings.length > 0)
            console.warn("Auto-translate warnings:", warnings);
        } catch (err) {
          console.error("Auto-translate failed:", err);
        }
      });
    }

    return Response.json(result);
  } catch (err) {
    console.error("Anki import error:", err);
    const message = err instanceof Error ? err.message : "Import failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
