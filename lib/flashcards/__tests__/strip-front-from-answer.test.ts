import { describe, expect, it } from "vitest";
import {
  isExtraDuplicate,
  stripFrontFromAnswer,
} from "../strip-front-from-answer";

describe("stripFrontFromAnswer", () => {
  it("strips exact match of question before ---", () => {
    const answer = "What is ATP?\n---\nAdenosine triphosphate";
    expect(stripFrontFromAnswer(answer, "What is ATP?")).toBe(
      "Adenosine triphosphate",
    );
  });

  it("returns original answer when no --- separator", () => {
    const answer = "Adenosine triphosphate";
    expect(stripFrontFromAnswer(answer, "What is ATP?")).toBe(answer);
  });

  it("returns original answer when pre-separator doesn't match question", () => {
    const answer = "Some other text\n---\nActual answer";
    expect(stripFrontFromAnswer(answer, "What is ATP?")).toBe(answer);
  });

  it("handles whitespace variations", () => {
    const answer = "What  is   ATP?\n---\nAdenosine triphosphate";
    expect(stripFrontFromAnswer(answer, "What is ATP?")).toBe(
      "Adenosine triphosphate",
    );
  });

  it("handles partial match (question starts with before)", () => {
    const answer = "What is ATP\n---\nAdenosine triphosphate";
    expect(stripFrontFromAnswer(answer, "What is ATP?")).toBe(
      "Adenosine triphosphate",
    );
  });

  it("returns original if after-separator is empty", () => {
    const answer = "What is ATP?\n---\n";
    expect(stripFrontFromAnswer(answer, "What is ATP?")).toBe(answer);
  });
});

describe("isExtraDuplicate", () => {
  it("detects duplicate when extra has same audio URLs as answer", () => {
    const answer =
      "chose\n\nn.\n\nthing\n\n[audio](https://example.com/a.mp3)[audio](https://example.com/b.mp3)";
    const extra =
      "[audio](https://example.com/a.mp3)\n\nthing\n\nn.\n\n[audio](https://example.com/b.mp3)";
    expect(isExtraDuplicate(answer, extra)).toBe(true);
  });

  it("returns false when extra has different audio URLs", () => {
    const answer = "word\n\n[audio](https://example.com/a.mp3)";
    const extra = "more info\n\n[audio](https://example.com/c.mp3)";
    expect(isExtraDuplicate(answer, extra)).toBe(false);
  });

  it("returns false for empty extra", () => {
    expect(isExtraDuplicate("some answer", "")).toBe(false);
  });

  it("detects high word overlap as duplicate (no audio)", () => {
    const answer = "The mitochondria is the powerhouse of the cell";
    const extra = "The powerhouse of the cell is the mitochondria";
    expect(isExtraDuplicate(answer, extra)).toBe(true);
  });

  it("returns false when extra has genuinely different content", () => {
    const answer = "ATP is adenosine triphosphate";
    const extra =
      "Discovered by Karl Lohmann in 1929, it plays a central role in metabolism";
    expect(isExtraDuplicate(answer, extra)).toBe(false);
  });
});
