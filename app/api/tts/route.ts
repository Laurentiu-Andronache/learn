import { createHash } from "crypto";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "XrExE9yKIg1WjnnlVkGX";
const BUCKET = "tts-audio";
const MAX_TEXT_LENGTH = 5000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

// In-memory rate limiter: userId → timestamps[]
const rateLimits = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimits.set(userId, recent);
    return true;
  }
  recent.push(now);
  rateLimits.set(userId, recent);
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
        setAll() {
          // Read-only in API routes — cookies can't be set here
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function POST(request: Request) {
  // Auth check
  const user = await getAuthUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Rate limit
  if (isRateLimited(user.id)) {
    return new Response("Rate limited", { status: 429 });
  }

  // Parse and validate body
  let text: string;
  let locale: string;
  try {
    const body = await request.json();
    text = body.text;
    locale = body.locale ?? "en";
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return new Response("Text is required", { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return new Response(`Text exceeds ${MAX_TEXT_LENGTH} characters`, {
      status: 400,
    });
  }

  // Cache key: SHA-256(voiceId:text)
  const hash = createHash("sha256")
    .update(`${VOICE_ID}:${text}`)
    .digest("hex");
  const storagePath = `${hash}.mp3`;

  // Check Supabase Storage cache
  const supabaseAdmin = getServiceClient();
  const { data: cached } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(storagePath);

  if (cached) {
    const buffer = await cached.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // ElevenLabs TTS
  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  try {
    const audioStream = await elevenlabs.textToSpeech.convert(VOICE_ID, {
      text: `... ${text}`,
      modelId: "eleven_multilingual_v2",
      voiceSettings: {
        stability: 0.7,
        similarityBoost: 0.5,
        style: 0.0,
        useSpeakerBoost: true,
      },
      languageCode: locale,
      outputFormat: "mp3_44100_128",
      applyTextNormalization: "on",
    });

    // Collect stream to buffer
    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Fire-and-forget upload to Supabase Storage
    supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      })
      .then(({ error }) => {
        if (error) console.error("TTS cache upload error:", error.message);
      })
      .catch((err) => {
        console.error("TTS cache upload exception:", err);
      });

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    return new Response("TTS generation failed", { status: 502 });
  }
}
