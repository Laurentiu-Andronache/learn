import { describe, it, expect } from "vitest";
import { preprocessTooltips } from "../preprocess-tooltips";

describe("preprocessTooltips", () => {
  it("converts basic tooltip syntax", () => {
    expect(preprocessTooltips("{{term|explanation}}")).toBe(
      '[term](tooltip "explanation")'
    );
  });

  it("handles multiple tooltips in one string", () => {
    const input = "Before {{a|desc a}} middle {{b|desc b}} after";
    const expected =
      'Before [a](tooltip "desc a") middle [b](tooltip "desc b") after';
    expect(preprocessTooltips(input)).toBe(expected);
  });

  it("escapes double quotes in explanations", () => {
    expect(preprocessTooltips('{{term|say "hello"}}')).toBe(
      '[term](tooltip "say &quot;hello&quot;")'
    );
  });

  it("skips fenced code blocks", () => {
    const input = "```\n{{term|explanation}}\n```";
    expect(preprocessTooltips(input)).toBe(input);
  });

  it("skips inline code", () => {
    const input = "`{{term|explanation}}`";
    expect(preprocessTooltips(input)).toBe(input);
  });

  it("rejects empty term", () => {
    const input = "{{ |explanation}}";
    expect(preprocessTooltips(input)).toBe(input);
  });

  it("rejects empty explanation", () => {
    const input = "{{term| }}";
    expect(preprocessTooltips(input)).toBe(input);
  });

  it("works in bold context", () => {
    const input = "**{{term|explanation}}** text";
    expect(preprocessTooltips(input)).toBe(
      '**[term](tooltip "explanation")** text'
    );
  });

  it("works in italic context", () => {
    const input = "*{{term|explanation}}* text";
    expect(preprocessTooltips(input)).toBe(
      '*[term](tooltip "explanation")* text'
    );
  });

  it("processes text between code segments", () => {
    const input = "`code` {{term|desc}} `more`";
    expect(preprocessTooltips(input)).toBe(
      '`code` [term](tooltip "desc") `more`'
    );
  });

  it("returns unchanged string when no tooltips present", () => {
    const input = "Regular markdown **text** with [links](url).";
    expect(preprocessTooltips(input)).toBe(input);
  });

  it("handles pipe characters in explanation", () => {
    const input = "{{term|this | that}}";
    expect(preprocessTooltips(input)).toBe(
      '[term](tooltip "this | that")'
    );
  });
});
