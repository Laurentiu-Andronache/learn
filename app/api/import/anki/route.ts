import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { after } from "next/server";
import type { AnkiImportOptions } from "@/lib/import/anki-types";
import { IMPORT_LIMITS } from "@/lib/import/anki-types";
import { importAnkiFile } from "@/lib/import/import-orchestrator";

// In-memory rate limiter: userId → timestamps[]
const importRateLimits = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = importRateLimits.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= IMPORT_LIMITS.importsPerHourPerUser) {
    importRateLimits.set(userId, recent);
    return true;
  }
  recent.push(now);
  importRateLimits.set(userId, recent);
  return false;
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Check admin status
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", user.email!)
    .maybeSingle();

  return { id: user.id, email: user.email!, isAdmin: !!admin };
}

export const maxDuration = 60; // Vercel Pro plan limit

export async function POST(request: Request) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRateLimited(authUser.id)) {
    return Response.json({ error: "Rate limited" }, { status: 429 });
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
    authUser.isAdmin && visibilityParam === "public" ? "public" : "private";
  const autoTranslate = authUser.isAdmin && autoTranslateParam === "true";

  const options: AnkiImportOptions = {
    language: language as "en" | "es",
    visibility,
    autoTranslate,
    userId: authUser.id,
    isAdmin: authUser.isAdmin,
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
          await translateTopicContent(result.topicId, language as "en" | "es");
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
