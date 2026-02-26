import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Controllable mocks (vi.hoisted runs before vi.mock hoisting) ────

const {
  mockAfter,
  mockImportAnkiFile,
  mockIsRateLimited,
  mockGetUser,
  mockCheckIsAdmin,
} = vi.hoisted(() => ({
  mockAfter: vi.fn(),
  mockImportAnkiFile: vi.fn(),
  mockIsRateLimited: vi.fn(() => false),
  mockGetUser: vi.fn(),
  mockCheckIsAdmin: vi.fn(),
}));

vi.mock("next/server", () => ({
  after: mockAfter,
}));

vi.mock("@/lib/import/import-orchestrator", () => ({
  importAnkiFile: mockImportAnkiFile,
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => mockIsRateLimited,
}));

vi.mock("@/lib/supabase/server", () => ({
  createApiClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } }),
  ),
  checkIsAdmin: mockCheckIsAdmin,
}));

import { POST } from "../route";

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Minimal FormData stub that returns a mock file with working `arrayBuffer()`.
 * jsdom's File/FormData lack full `arrayBuffer()` support, so we build our own.
 */
function makeMockFormData(opts?: {
  fileName?: string;
  fileSize?: number;
  language?: string;
  visibility?: string;
  autoTranslate?: string;
  noFile?: boolean;
}): FormData {
  const entries = new Map<string, string>();
  let mockFile: {
    name: string;
    size: number;
    arrayBuffer: () => Promise<ArrayBuffer>;
  } | null = null;

  if (!opts?.noFile) {
    const bytes = new Uint8Array(opts?.fileSize ?? 100);
    mockFile = {
      name: opts?.fileName ?? "deck.apkg",
      size: opts?.fileSize ?? 100,
      arrayBuffer: () => Promise.resolve(bytes.buffer as ArrayBuffer),
    };
  }
  if (opts?.language) entries.set("language", opts.language);
  if (opts?.visibility) entries.set("visibility", opts.visibility);
  if (opts?.autoTranslate) entries.set("autoTranslate", opts.autoTranslate);

  return {
    get: (key: string) => {
      if (key === "file") return mockFile;
      return entries.get(key) ?? null;
    },
  } as unknown as FormData;
}

function makeRequest(opts?: Parameters<typeof makeMockFormData>[0]): Request {
  const req = new Request("http://localhost/api/import/anki", {
    method: "POST",
  });
  req.formData = () => Promise.resolve(makeMockFormData(opts));
  return req;
}

const MOCK_USER = { id: "user-123", email: "test@example.com" };
const MOCK_RESULT = {
  topicId: "topic-1",
  flashcardsImported: 42,
  mediaUploaded: 5,
  warnings: [],
};

// ── Setup ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
  mockCheckIsAdmin.mockResolvedValue(false);
  mockImportAnkiFile.mockResolvedValue(MOCK_RESULT);
  mockIsRateLimited.mockReturnValue(false);
});

// ── Tests ────────────────────────────────────────────────────────────

describe("POST /api/import/anki", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockReturnValue(true);

    const res = await POST(makeRequest());

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Rate limited" });
  });

  it("returns 400 when no file is provided", async () => {
    const res = await POST(makeRequest({ noFile: true }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No file provided" });
  });

  it("returns 400 for invalid file format", async () => {
    const res = await POST(makeRequest({ fileName: "notes.txt" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid file format");
  });

  it("returns 400 when file exceeds size limit", async () => {
    const res = await POST(makeRequest({ fileSize: 51 * 1024 * 1024 }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("File too large");
  });

  it("returns 400 for invalid language", async () => {
    const res = await POST(makeRequest({ language: "fr" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid language" });
  });

  it("successfully imports and returns result for valid .apkg file", async () => {
    const res = await POST(
      makeRequest({ language: "en", visibility: "private" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(MOCK_RESULT);
    expect(mockImportAnkiFile).toHaveBeenCalledOnce();
    expect(mockImportAnkiFile).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.objectContaining({
        language: "en",
        visibility: "private",
        userId: "user-123",
        isAdmin: false,
        autoTranslate: false,
      }),
    );
  });

  it("non-admin users always get private visibility even when requesting public", async () => {
    const res = await POST(makeRequest({ visibility: "public" }));

    expect(res.status).toBe(200);
    expect(mockImportAnkiFile).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.objectContaining({ visibility: "private", isAdmin: false }),
    );
  });

  it("returns 500 when importAnkiFile throws", async () => {
    mockImportAnkiFile.mockRejectedValue(new Error("Corrupt .apkg file"));

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Corrupt .apkg file" });
  });
});
