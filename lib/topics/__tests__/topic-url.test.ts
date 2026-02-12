import { describe, expect, it } from "vitest";
import { topicUrl } from "../topic-url";

describe("topicUrl", () => {
  it("uses slug when available", () => {
    expect(topicUrl({ id: "abc-123", slug: "vaccines" })).toBe(
      "/topics/vaccines",
    );
  });

  it("falls back to id when slug is null", () => {
    expect(topicUrl({ id: "abc-123", slug: null })).toBe("/topics/abc-123");
  });

  it("falls back to id when slug is undefined", () => {
    expect(topicUrl({ id: "abc-123" })).toBe("/topics/abc-123");
  });

  it("falls back to id when slug is empty string", () => {
    expect(topicUrl({ id: "abc-123", slug: "" })).toBe("/topics/abc-123");
  });

  it("appends sub-path after slug", () => {
    expect(topicUrl({ id: "abc-123", slug: "vaccines" }, "flashcards")).toBe(
      "/topics/vaccines/flashcards",
    );
  });

  it("appends sub-path after id when no slug", () => {
    expect(topicUrl({ id: "abc-123" }, "quiz")).toBe("/topics/abc-123/quiz");
  });

  it("appends reading sub-path", () => {
    expect(topicUrl({ id: "abc-123", slug: "sleep" }, "reading")).toBe(
      "/topics/sleep/reading",
    );
  });
});
