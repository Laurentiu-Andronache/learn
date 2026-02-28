import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks (available inside vi.mock factories) ──────────────

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isRateLimited: vi.fn(() => false),
  convert: vi.fn(),
  afterFn: vi.fn(),
}));

// ── Module mocks ────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createApiClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mocks.getUser } }),
  ),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => mocks.isRateLimited),
}));

vi.mock("@elevenlabs/elevenlabs-js", () => ({
  ElevenLabsClient: class {
    textToSpeech = { convert: mocks.convert };
  },
}));

vi.mock("next/server", () => ({
  after: mocks.afterFn,
}));

vi.mock("@/lib/env", () => ({
  env: {
    SUPABASE_URL: "http://localhost:54321",
    ELEVENLABS_API_KEY: "test-elevenlabs-key",
    ELEVENLABS_VOICE_ID: "test-voice-id",
    SERVICE_ROLE_KEY: "test-service-role-key",
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────

function makeRequest(body?: unknown): Request {
  if (body === undefined) {
    return new Request("http://localhost/api/tts", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Request("http://localhost/api/tts", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeAudioStream(data: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
}

const FAKE_AUDIO = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);

// ── Setup ───────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
  mocks.isRateLimited.mockReturnValue(false);
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 404 }));
  mocks.convert.mockResolvedValue(makeAudioStream(FAKE_AUDIO));
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

import { POST } from "../route";

// ── Tests ───────────────────────────────────────────────────────────

describe("POST /api/tts", () => {
  it("returns 401 when user is not authenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ text: "Hello" }));

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("returns 429 when rate limited", async () => {
    mocks.isRateLimited.mockReturnValue(true);

    const res = await POST(makeRequest({ text: "Hello" }));

    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("Rate limited");
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid JSON");
  });

  it("returns 400 when text is missing or empty", async () => {
    const resMissing = await POST(makeRequest({}));
    expect(resMissing.status).toBe(400);
    expect((await resMissing.json()).error).toBe("Text is required");

    const resEmpty = await POST(makeRequest({ text: "   " }));
    expect(resEmpty.status).toBe(400);
    expect((await resEmpty.json()).error).toBe("Text is required");

    const resNonString = await POST(makeRequest({ text: 42 }));
    expect(resNonString.status).toBe(400);
    expect((await resNonString.json()).error).toBe("Text is required");
  });

  it("returns 400 when text exceeds 5000 characters", async () => {
    const res = await POST(makeRequest({ text: "x".repeat(5001) }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Text exceeds 5000 characters");
  });

  it("returns cached audio on Supabase Storage cache hit", async () => {
    const cachedAudio = new Uint8Array([0x01, 0x02, 0x03]);
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(cachedAudio, { status: 200 }),
    );

    const res = await POST(makeRequest({ text: "Hello" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(res.headers.get("Cache-Control")).toContain("immutable");
    // Response includes silence prefix + cached audio
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(cachedAudio.length);
    expect(mocks.convert).not.toHaveBeenCalled();
  });

  it("generates audio via ElevenLabs on cache miss", async () => {
    const res = await POST(makeRequest({ text: "Hello" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(res.headers.get("Cache-Control")).toContain("immutable");
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(FAKE_AUDIO.length);
    expect(mocks.convert).toHaveBeenCalledTimes(1);
    // after() called to upload to cache
    expect(mocks.afterFn).toHaveBeenCalledTimes(1);
    expect(typeof mocks.afterFn.mock.calls[0][0]).toBe("function");
  });

  it("returns 502 when ElevenLabs fails", async () => {
    mocks.convert.mockRejectedValue(new Error("API down"));

    const res = await POST(makeRequest({ text: "Hello" }));

    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("TTS generation failed");
  });
});
