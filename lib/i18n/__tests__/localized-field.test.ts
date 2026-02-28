import { describe, expect, it } from "vitest";
import { localizedArrayField, localizedField } from "../localized-field";

describe("localizedField", () => {
  it("returns primary locale value", () => {
    expect(
      localizedField({ title_en: "Hello", title_es: "Hola" }, "title", "en"),
    ).toBe("Hello");
    expect(
      localizedField({ title_en: "Hello", title_es: "Hola" }, "title", "es"),
    ).toBe("Hola");
  });

  it("falls back to other locale when primary is empty", () => {
    expect(
      localizedField({ title_en: "Hello", title_es: "" }, "title", "es"),
    ).toBe("Hello");
    expect(
      localizedField({ title_en: "", title_es: "Hola" }, "title", "en"),
    ).toBe("Hola");
  });

  it("falls back to other locale when primary is null/undefined", () => {
    expect(
      localizedField({ title_en: "Hello", title_es: null }, "title", "es"),
    ).toBe("Hello");
    expect(localizedField({ title_en: "Hello" }, "title", "es")).toBe("Hello");
  });

  it("returns empty string when both are missing", () => {
    expect(localizedField({}, "title", "en")).toBe("");
    expect(
      localizedField({ title_en: null, title_es: null }, "title", "en"),
    ).toBe("");
  });
});

describe("localizedArrayField", () => {
  it("returns primary locale array", () => {
    const item = { options_en: ["A", "B"], options_es: ["X", "Y"] };
    expect(localizedArrayField(item, "options", "en")).toEqual(["A", "B"]);
    expect(localizedArrayField(item, "options", "es")).toEqual(["X", "Y"]);
  });

  it("falls back to other locale when primary is empty array", () => {
    expect(
      localizedArrayField(
        { options_en: ["A"], options_es: [] },
        "options",
        "es",
      ),
    ).toEqual(["A"]);
  });

  it("falls back to other locale when primary is null/undefined", () => {
    expect(localizedArrayField({ options_en: ["A"] }, "options", "es")).toEqual(
      ["A"],
    );
    expect(
      localizedArrayField(
        { options_en: ["A"], options_es: null },
        "options",
        "es",
      ),
    ).toEqual(["A"]);
  });

  it("returns empty array when both are missing", () => {
    expect(localizedArrayField({}, "options", "en")).toEqual([]);
  });
});
