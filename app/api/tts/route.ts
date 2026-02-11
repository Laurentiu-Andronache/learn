import { createHash } from "crypto";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { after } from "next/server";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "XrExE9yKIg1WjnnlVkGX";
const BUCKET = "tts-audio";
const MAX_TEXT_LENGTH = 5000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

// ~200ms silent MP3 at 44.1kHz 128kbps — prepended to all audio to prevent ElevenLabs first-word clipping
const SILENCE_MP3 = Buffer.from(
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//uQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSxDkDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7ksQ5A8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5LEOQPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSxDkDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7ksQ5A8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=",
  "base64",
);

const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// LEARN_SERVICE_ROLE_KEY avoids collision with ~/.bashrc SUPABASE_SERVICE_ROLE_KEY (Launcher project)
const SERVICE_KEY = (process.env.LEARN_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!;

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

/** Prepend ~200ms silence to prevent ElevenLabs first-word clipping */
function withSilencePrefix(audio: Buffer): ArrayBuffer {
  const combined = Buffer.concat([SILENCE_MP3, audio]);
  return combined.buffer.slice(
    combined.byteOffset,
    combined.byteOffset + combined.byteLength,
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

  // Check Supabase Storage cache (raw fetch to bypass Next.js fetch patching)
  try {
    const cacheRes = await fetch(
      `${STORAGE_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
      {
        headers: { Authorization: `Bearer ${SERVICE_KEY}` },
        cache: "no-store",
      },
    );
    if (cacheRes.ok) {
      const buffer = Buffer.from(await cacheRes.arrayBuffer());
      return new Response(withSilencePrefix(buffer), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch {
    // Cache miss or network error — proceed to generate
  }

  // ElevenLabs TTS
  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  try {
    const audioStream = await elevenlabs.textToSpeech.convert(VOICE_ID, {
      text,
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

    // Upload to Supabase Storage after response is sent (kept-alive context)
    const audioBytes = new Uint8Array(audioBuffer);
    after(async () => {
      try {
        const res = await fetch(
          `${STORAGE_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_KEY}`,
              "Content-Type": "audio/mpeg",
              "x-upsert": "true",
            },
            body: audioBytes,
            cache: "no-store",
          },
        );
        if (!res.ok)
          console.error(
            "TTS cache upload error:",
            res.status,
            await res.text(),
          );
      } catch (err) {
        console.error("TTS cache upload exception:", err);
      }
    });

    return new Response(withSilencePrefix(audioBuffer), {
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
