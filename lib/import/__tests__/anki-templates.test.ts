import { describe, expect, it } from "vitest";
import {
  expandCloze,
  expandTemplates,
  htmlToMarkdown,
  processNoteToFlashcards,
  renderTemplate,
  sanitizeHtml,
  stripOrphanedJS,
} from "../anki-templates";
import type { AnkiModel } from "../anki-types";

// ── renderTemplate ──────────────────────────────────────────────────────────

describe("renderTemplate", () => {
  it("substitutes basic field placeholders", () => {
    const result = renderTemplate("{{Front}}", {
      Front: "Hello",
      Back: "World",
    });
    expect(result).toBe("Hello");
  });

  it("substitutes multiple fields", () => {
    const result = renderTemplate("Q: {{Front}} A: {{Back}}", {
      Front: "What?",
      Back: "This!",
    });
    expect(result).toBe("Q: What? A: This!");
  });

  it("handles fields with spaces in their names", () => {
    const result = renderTemplate("{{First Name}} {{Last Name}}", {
      "First Name": "John",
      "Last Name": "Doe",
    });
    expect(result).toBe("John Doe");
  });

  it("replaces missing fields with empty string", () => {
    const result = renderTemplate("{{Front}} {{Missing}}", { Front: "Hi" });
    expect(result).toBe("Hi ");
  });

  it("renders conditional blocks when field is non-empty", () => {
    const result = renderTemplate("{{#Extra}}Extra: {{Extra}}{{/Extra}}", {
      Extra: "bonus info",
    });
    expect(result).toBe("Extra: bonus info");
  });

  it("hides conditional blocks when field is empty", () => {
    const result = renderTemplate(
      "Start{{#Extra}} Extra: {{Extra}}{{/Extra}} End",
      { Extra: "" },
    );
    expect(result).toBe("Start End");
  });

  it("hides conditional blocks when field is whitespace-only", () => {
    const result = renderTemplate("{{#Notes}}Has notes{{/Notes}}", {
      Notes: "   ",
    });
    expect(result).toBe("");
  });

  it("renders inverted blocks when field is empty", () => {
    const result = renderTemplate("{{^Hint}}No hint available{{/Hint}}", {
      Hint: "",
    });
    expect(result).toBe("No hint available");
  });

  it("hides inverted blocks when field is non-empty", () => {
    const result = renderTemplate("{{^Hint}}No hint{{/Hint}}", {
      Hint: "a hint",
    });
    expect(result).toBe("");
  });

  it("substitutes {{FrontSide}} with rendered front", () => {
    const result = renderTemplate(
      "{{FrontSide}}<hr>{{Back}}",
      { Back: "Answer" },
      "The Question",
    );
    expect(result).toBe("The Question<hr>Answer");
  });

  it("substitutes {{FrontSide}} with empty string when not provided", () => {
    const result = renderTemplate("{{FrontSide}}", {});
    expect(result).toBe("");
  });

  it("handles {{type:Field}} by showing field value", () => {
    const result = renderTemplate("Type: {{type:Answer}}", {
      Answer: "mitochondria",
    });
    expect(result).toBe("Type: mitochondria");
  });

  it("handles {{hint:Field}} by wrapping in parentheses", () => {
    const result = renderTemplate("{{hint:Mnemonic}}", {
      Mnemonic: "ROY G BIV",
    });
    expect(result).toBe("(ROY G BIV)");
  });

  it("handles {{hint:Field}} with empty value → empty string", () => {
    const result = renderTemplate("{{hint:Mnemonic}}", { Mnemonic: "" });
    expect(result).toBe("");
  });

  it("handles unknown prefix {{xxx:Field}} by showing field value", () => {
    const result = renderTemplate("{{tts:Front}}", { Front: "spoken text" });
    expect(result).toBe("spoken text");
  });

  it("handles nested conditional blocks", () => {
    const result = renderTemplate(
      "{{#A}}A exists{{#B}} and B exists{{/B}}{{/A}}",
      { A: "yes", B: "also yes" },
    );
    expect(result).toBe("A exists and B exists");
  });

  it("handles nested conditional where inner is empty", () => {
    const result = renderTemplate(
      "{{#A}}A exists{{#B}} and B exists{{/B}}{{/A}}",
      { A: "yes", B: "" },
    );
    expect(result).toBe("A exists");
  });

  it("handles conditional with field name containing spaces", () => {
    const result = renderTemplate(
      "{{#Extra Info}}Note: {{Extra Info}}{{/Extra Info}}",
      { "Extra Info": "important" },
    );
    expect(result).toBe("Note: important");
  });
});

// ── expandCloze ─────────────────────────────────────────────────────────────

describe("expandCloze", () => {
  it("expands single cloze to one card", () => {
    const result = expandCloze("The {{c1::mitochondria}} is the powerhouse");
    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("The [...] is the powerhouse");
    expect(result[0].back).toBe("The mitochondria is the powerhouse");
  });

  it("expands multiple cloze numbers to multiple cards", () => {
    const result = expandCloze(
      "{{c1::Berlin}} is the capital of {{c2::Germany}}",
    );
    expect(result).toHaveLength(2);

    // Card for c1: Berlin blanked, Germany revealed
    expect(result[0].front).toBe("[...] is the capital of Germany");
    expect(result[0].back).toBe("Berlin is the capital of Germany");

    // Card for c2: Berlin revealed, Germany blanked
    expect(result[1].front).toBe("Berlin is the capital of [...]");
    expect(result[1].back).toBe("Berlin is the capital of Germany");
  });

  it("uses hint text when provided", () => {
    const result = expandCloze(
      "The {{c1::mitochondria::organelle}} is the powerhouse",
    );
    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("The [organelle] is the powerhouse");
    expect(result[0].back).toBe("The mitochondria is the powerhouse");
  });

  it("handles same cloze number used multiple times", () => {
    const result = expandCloze("{{c1::A}} and {{c1::B}} are letters");
    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("[...] and [...] are letters");
    expect(result[0].back).toBe("A and B are letters");
  });

  it("returns empty array when no cloze deletions found", () => {
    const result = expandCloze("No cloze here");
    expect(result).toEqual([]);
  });

  it("sorts cards by cloze number", () => {
    const result = expandCloze("{{c3::C}} {{c1::A}} {{c2::B}}");
    expect(result).toHaveLength(3);
    // Sorted by cloze number: c1, c2, c3
    // c1 card: blank c1, reveal c2 and c3
    expect(result[0].front).toBe("C [...] B");
    // c2 card: blank c2, reveal c1 and c3
    expect(result[1].front).toBe("C A [...]");
    // c3 card: blank c3, reveal c1 and c2
    expect(result[2].front).toBe("[...] A B");
    // All backs are the same — all clozes revealed
    expect(result[0].back).toBe("C A B");
    expect(result[1].back).toBe("C A B");
    expect(result[2].back).toBe("C A B");
  });
});

// ── expandTemplates ─────────────────────────────────────────────────────────

describe("expandTemplates", () => {
  it("generates one card per template for standard model", () => {
    const fields = { Front: "Question?", Back: "Answer!" };
    const model = {
      type: 0,
      tmpls: [
        {
          name: "Card 1",
          ord: 0,
          qfmt: "{{Front}}",
          afmt: "{{FrontSide}}<hr>{{Back}}",
        },
        {
          name: "Card 2",
          ord: 1,
          qfmt: "{{Back}}",
          afmt: "{{FrontSide}}<hr>{{Front}}",
        },
      ],
    };

    const result = expandTemplates(fields, model);
    expect(result).toHaveLength(2);
    expect(result[0].templateName).toBe("Card 1");
    expect(result[0].front).toBe("Question?");
    expect(result[0].back).toBe("Question?<hr>Answer!");
    expect(result[1].templateName).toBe("Card 2");
    expect(result[1].front).toBe("Answer!");
  });

  it("skips templates with empty front", () => {
    const fields = { Front: "Question?", Back: "", Optional: "" };
    const model = {
      type: 0,
      tmpls: [
        { name: "Card 1", ord: 0, qfmt: "{{Front}}", afmt: "{{Back}}" },
        { name: "Card 2", ord: 1, qfmt: "{{Optional}}", afmt: "{{Front}}" },
      ],
    };

    const result = expandTemplates(fields, model);
    // Card 2 has empty front (Optional is empty), so it's skipped
    // Card 1 has non-empty front, but its back (Back) is empty, so also skipped
    expect(result).toHaveLength(0);
  });

  it("skips templates with empty back", () => {
    const fields = { Front: "Question?", Back: "" };
    const model = {
      type: 0,
      tmpls: [{ name: "Card 1", ord: 0, qfmt: "{{Front}}", afmt: "{{Back}}" }],
    };

    const result = expandTemplates(fields, model);
    expect(result).toHaveLength(0);
  });

  it("generates cloze cards from cloze model", () => {
    const fields = {
      Text: "{{c1::Berlin}} is the capital of {{c2::Germany}}",
      Extra: "Geography",
    };
    const model = {
      type: 1,
      tmpls: [
        {
          name: "Cloze",
          ord: 0,
          qfmt: "{{Text}}",
          afmt: "{{FrontSide}}<hr>{{Extra}}",
        },
      ],
    };

    const result = expandTemplates(fields, model);
    expect(result).toHaveLength(2);
    expect(result[0].templateName).toBe("Cloze (c1)");
    expect(result[1].templateName).toBe("Cloze (c2)");
    expect(result[0].front).toBe("[...] is the capital of Germany");
  });

  it("returns empty for cloze model with no cloze deletions in template output", () => {
    const fields = { Text: "No cloze here" };
    const model = {
      type: 1,
      tmpls: [
        { name: "Cloze", ord: 0, qfmt: "{{Text}}", afmt: "{{FrontSide}}" },
      ],
    };

    const result = expandTemplates(fields, model);
    expect(result).toEqual([]);
  });

  it("returns empty for cloze model with no templates", () => {
    const fields = { Text: "{{c1::test}}" };
    const model = { type: 1, tmpls: [] };

    const result = expandTemplates(fields, model);
    expect(result).toEqual([]);
  });

  it("cloze back template reveals all deletions", () => {
    const fields = {
      Text: "{{c1::A}} and {{c2::B}}",
    };
    const model = {
      type: 1,
      tmpls: [{ name: "Cloze", ord: 0, qfmt: "{{Text}}", afmt: "{{Text}}" }],
    };

    const result = expandTemplates(fields, model);
    expect(result).toHaveLength(2);
    // Backs should have all clozes revealed
    expect(result[0].back).toBe("A and B");
    expect(result[1].back).toBe("A and B");
  });
});

// ── htmlToMarkdown ──────────────────────────────────────────────────────────

describe("htmlToMarkdown", () => {
  it("converts <br> to newline", () => {
    expect(htmlToMarkdown("Hello<br>World")).toBe("Hello\nWorld");
    expect(htmlToMarkdown("Hello<br/>World")).toBe("Hello\nWorld");
    expect(htmlToMarkdown("Hello<br />World")).toBe("Hello\nWorld");
  });

  it("converts <hr> to markdown rule", () => {
    const result = htmlToMarkdown("Above<hr>Below");
    expect(result).toContain("---");
  });

  it("converts <img> to markdown image", () => {
    expect(htmlToMarkdown('<img src="photo.jpg">')).toBe("![](photo.jpg)");
    expect(htmlToMarkdown("<img src='photo.jpg'>")).toBe("![](photo.jpg)");
  });

  it("converts [sound:file.mp3] to audio link", () => {
    expect(htmlToMarkdown("[sound:pronunciation.mp3]")).toBe(
      "[audio](pronunciation.mp3)",
    );
  });

  it("converts <b> and <strong> to markdown bold", () => {
    expect(htmlToMarkdown("<b>bold</b>")).toBe("**bold**");
    expect(htmlToMarkdown("<strong>bold</strong>")).toBe("**bold**");
  });

  it("converts <i> and <em> to markdown italic", () => {
    expect(htmlToMarkdown("<i>italic</i>")).toBe("*italic*");
    expect(htmlToMarkdown("<em>italic</em>")).toBe("*italic*");
  });

  it("converts <a> tags to markdown links", () => {
    expect(htmlToMarkdown('<a href="https://example.com">link</a>')).toBe(
      "[link](https://example.com)",
    );
  });

  it("converts list items", () => {
    const result = htmlToMarkdown("<ul><li>one</li><li>two</li></ul>");
    expect(result).toContain("- one");
    expect(result).toContain("- two");
  });

  it("converts tables to markdown tables", () => {
    const html =
      "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>";
    const result = htmlToMarkdown(html);
    expect(result).toContain("| A | B |");
    expect(result).toContain("| --- | --- |");
    expect(result).toContain("| 1 | 2 |");
  });

  it("decodes HTML entities", () => {
    expect(htmlToMarkdown("&amp; &lt; &gt; &nbsp; &quot;")).toBe('& < >   "');
  });

  it("decodes numeric HTML entities", () => {
    expect(htmlToMarkdown("&#39;")).toBe("'");
    expect(htmlToMarkdown("&#x27;")).toBe("'");
  });

  it("strips remaining HTML tags", () => {
    expect(htmlToMarkdown("<span class='foo'>text</span>")).toBe("text");
    expect(htmlToMarkdown("<div>block</div>")).toBe("block");
  });

  it("collapses excessive newlines", () => {
    const result = htmlToMarkdown("a<br><br><br><br>b");
    expect(result).toBe("a\n\nb");
  });

  it("trims leading and trailing whitespace", () => {
    expect(htmlToMarkdown("  <br> hello <br>  ")).toBe("hello");
  });

  it("strips <u>, <sub>, <sup> leaving text only", () => {
    expect(htmlToMarkdown("<u>underline</u>")).toBe("underline");
    expect(htmlToMarkdown("H<sub>2</sub>O")).toBe("H2O");
    expect(htmlToMarkdown("x<sup>2</sup>")).toBe("x2");
  });

  it("handles mixed content", () => {
    const html =
      '<b>Bold</b> and <i>italic</i><br>New line with <img src="pic.png">';
    const result = htmlToMarkdown(html);
    expect(result).toContain("**Bold**");
    expect(result).toContain("*italic*");
    expect(result).toContain("![](pic.png)");
  });
});

// ── sanitizeHtml ────────────────────────────────────────────────────────────

describe("sanitizeHtml", () => {
  it("removes <script> tags and content", () => {
    expect(sanitizeHtml('<script>alert("xss")</script>safe')).toBe("safe");
  });

  it("removes <style> tags and content", () => {
    expect(sanitizeHtml("<style>.x{color:red}</style>text")).toBe("text");
  });

  it("removes <link> tags", () => {
    expect(sanitizeHtml('<link rel="stylesheet" href="evil.css">text')).toBe(
      "text",
    );
  });

  it("removes <iframe> tags and content", () => {
    expect(sanitizeHtml('<iframe src="evil.html">content</iframe>safe')).toBe(
      "safe",
    );
  });

  it("removes <object> and <embed> tags", () => {
    expect(sanitizeHtml('<object data="x">content</object>safe')).toBe("safe");
    expect(sanitizeHtml('<embed src="x.swf">safe')).toBe("safe");
  });

  it("removes on* event handlers", () => {
    expect(sanitizeHtml('<div onclick="alert(1)">text</div>')).toBe(
      "<div>text</div>",
    );
    expect(sanitizeHtml('<img onerror="alert(1)" src="x.png">')).toBe(
      '<img src="x.png">',
    );
  });

  it("removes javascript: URLs from href", () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript:");
    expect(result).toContain("click");
  });

  it("removes javascript: URLs from src", () => {
    const result = sanitizeHtml('<img src="javascript:alert(1)">');
    expect(result).not.toContain("javascript:");
  });

  it("preserves safe HTML content", () => {
    const safe = '<b>Bold</b> <img src="photo.jpg">';
    expect(sanitizeHtml(safe)).toBe(safe);
  });

  it("handles multiple dangerous elements in one string", () => {
    const dirty =
      '<script>bad</script><b>ok</b><style>.x{}</style><a href="javascript:void(0)">link</a>';
    const result = sanitizeHtml(dirty);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("<style");
    expect(result).not.toContain("javascript:");
    expect(result).toContain("<b>ok</b>");
    expect(result).toContain("link");
  });
});

// ── processNoteToFlashcards ─────────────────────────────────────────────────

describe("processNoteToFlashcards", () => {
  const standardModel: AnkiModel = {
    id: "model-1",
    name: "Basic",
    type: 0,
    flds: [
      { name: "Front", ord: 0 },
      { name: "Back", ord: 1 },
      { name: "Notes", ord: 2 },
    ],
    tmpls: [
      {
        name: "Card 1",
        ord: 0,
        qfmt: "{{Front}}",
        afmt: "{{FrontSide}}<hr id=answer>{{Back}}",
      },
    ],
  };

  it("produces a flashcard with markdown-converted front and back", () => {
    const fields = ["<b>Question</b>", "<i>Answer</i>", ""];
    const fieldNames = ["Front", "Back", "Notes"];

    const result = processNoteToFlashcards(
      fields,
      fieldNames,
      standardModel,
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("**Question**");
    expect(result[0].back).toContain("*Answer*");
    expect(result[0].templateName).toBe("Card 1");
  });

  it("includes extra fields beyond the first two", () => {
    const fields = ["Front text", "Back text", "Some <b>extra</b> notes"];
    const fieldNames = ["Front", "Back", "Notes"];

    const result = processNoteToFlashcards(
      fields,
      fieldNames,
      standardModel,
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].extra).toBe("Some **extra** notes");
  });

  it("ignores empty extra fields", () => {
    const fields = ["Front text", "Back text", "", "   "];
    const fieldNames = ["Front", "Back", "Notes", "Extra"];
    const model: AnkiModel = {
      ...standardModel,
      flds: [
        { name: "Front", ord: 0 },
        { name: "Back", ord: 1 },
        { name: "Notes", ord: 2 },
        { name: "Extra", ord: 3 },
      ],
    };

    const result = processNoteToFlashcards(fields, fieldNames, model, []);
    expect(result[0].extra).toBe("");
  });

  it("sanitizes field values (removes scripts)", () => {
    const fields = [
      '<script>alert("xss")</script>Clean question',
      "Answer",
      "",
    ];
    const fieldNames = ["Front", "Back", "Notes"];

    const result = processNoteToFlashcards(
      fields,
      fieldNames,
      standardModel,
      [],
    );
    expect(result[0].front).not.toContain("script");
    expect(result[0].front).toContain("Clean question");
  });

  it("handles cloze model end-to-end", () => {
    // Note: cloze templates use {{Text}} (not {{cloze:Text}}) so the
    // catch-all regex in renderTemplate doesn't consume cloze markers
    // injected by field substitution. This mirrors how expandTemplates
    // processes cloze content.
    const clozeModel: AnkiModel = {
      id: "model-cloze",
      name: "Cloze",
      type: 1,
      flds: [
        { name: "Text", ord: 0 },
        { name: "Extra", ord: 1 },
      ],
      tmpls: [
        {
          name: "Cloze",
          ord: 0,
          qfmt: "{{Text}}",
          afmt: "{{Text}}<br>{{Extra}}",
        },
      ],
    };

    const fields = [
      "{{c1::Mitochondria}} is the {{c2::powerhouse}}",
      "Biology fact",
    ];
    const fieldNames = ["Text", "Extra"];

    const result = processNoteToFlashcards(fields, fieldNames, clozeModel, []);
    expect(result).toHaveLength(2);
    expect(result[0].front).toContain("[...]");
    expect(result[0].front).toContain("powerhouse");
    expect(result[1].front).toContain("Mitochondria");
    expect(result[1].front).toContain("[...]");
  });

  it("returns empty array when front and back are empty", () => {
    const fields = ["", "", ""];
    const fieldNames = ["Front", "Back", "Notes"];

    const result = processNoteToFlashcards(
      fields,
      fieldNames,
      standardModel,
      [],
    );
    expect(result).toEqual([]);
  });

  it("handles fields shorter than fieldNames (missing fields default to empty)", () => {
    const fields = ["Only front"];
    const fieldNames = ["Front", "Back", "Notes"];

    const result = processNoteToFlashcards(
      fields,
      fieldNames,
      standardModel,
      [],
    );
    // fields[1] is undefined → fieldMap["Back"] = "" via ?? ""
    // The back template is "{{FrontSide}}<hr id=answer>{{Back}}" which renders
    // to "Only front<hr id=answer>" — after HTML stripping this is "Only front" (non-empty)
    // So one card is produced, with Back containing the FrontSide content
    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("Only front");
    expect(result[0].back).toContain("Only front");
  });

  it("converts HTML in all parts of the pipeline", () => {
    const fields = [
      "What is <b>H<sub>2</sub>O</b>?",
      "It is <i>water</i><br>Dihydrogen monoxide",
      '<img src="water.png">',
    ];
    const fieldNames = ["Front", "Back", "Notes"];

    const result = processNoteToFlashcards(
      fields,
      fieldNames,
      standardModel,
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("What is **H2O**?");
    expect(result[0].back).toContain("*water*");
    expect(result[0].back).toContain("Dihydrogen monoxide");
    expect(result[0].extra).toBe("![](water.png)");
  });

  it("processes multi-template standard model", () => {
    const twoCardModel: AnkiModel = {
      id: "model-2",
      name: "Basic (and reversed)",
      type: 0,
      flds: [
        { name: "Front", ord: 0 },
        { name: "Back", ord: 1 },
      ],
      tmpls: [
        {
          name: "Card 1",
          ord: 0,
          qfmt: "{{Front}}",
          afmt: "{{FrontSide}}<hr>{{Back}}",
        },
        {
          name: "Card 2",
          ord: 1,
          qfmt: "{{Back}}",
          afmt: "{{FrontSide}}<hr>{{Front}}",
        },
      ],
    };

    const fields = ["Capital of France?", "Paris"];
    const fieldNames = ["Front", "Back"];

    const result = processNoteToFlashcards(
      fields,
      fieldNames,
      twoCardModel,
      [],
    );
    expect(result).toHaveLength(2);
    expect(result[0].templateName).toBe("Card 1");
    expect(result[0].front).toBe("Capital of France?");
    expect(result[1].templateName).toBe("Card 2");
    expect(result[1].front).toBe("Paris");
  });

  it("strips <script> blocks from templates before rendering (Bug 1 fix)", () => {
    const modelWithScript: AnkiModel = {
      id: "model-script",
      name: "French Vocab",
      type: 0,
      flds: [
        { name: "Word", ord: 0 },
        { name: "Translation", ord: 1 },
      ],
      tmpls: [
        {
          name: "Card 1",
          ord: 0,
          qfmt: "{{Word}}",
          afmt: `{{FrontSide}}<hr><div>{{Translation}}</div>
<script>
var elem = document.querySelector(".replaybutton");
if (elem) { elem.click(); }
function revealTranslation() {
  document.getElementById("link").innerHTML = "{{Translation}}";
}
document.addEventListener('keypress', function(event) {
  if (event.key === '.') { revealTranslation(); }
});
</script>`,
        },
      ],
    };

    const fields = ["chose", "thing"];
    const fieldNames = ["Word", "Translation"];

    const result = processNoteToFlashcards(
      fields,
      fieldNames,
      modelWithScript,
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].back).not.toContain("document.querySelector");
    expect(result[0].back).not.toContain("addEventListener");
    expect(result[0].back).not.toContain("function revealTranslation");
    expect(result[0].back).toContain("thing");
  });

  it("strips unclosed <script> blocks from templates (Bug 1 edge case)", () => {
    const modelWithUnclosedScript: AnkiModel = {
      id: "model-unclosed",
      name: "Vocab",
      type: 0,
      flds: [
        { name: "Front", ord: 0 },
        { name: "Back", ord: 1 },
      ],
      tmpls: [
        {
          name: "Card 1",
          ord: 0,
          qfmt: "{{Front}}",
          afmt: `{{FrontSide}}<hr>{{Back}}<script>
// unclosed script tag
var x = document.querySelector(".foo");
if (x) { x.click(); }`,
        },
      ],
    };

    const fields = ["Question", "Answer"];
    const fieldNames = ["Front", "Back"];

    const result = processNoteToFlashcards(
      fields,
      fieldNames,
      modelWithUnclosedScript,
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].back).not.toContain("document.querySelector");
    expect(result[0].back).not.toContain("var x");
    expect(result[0].back).toContain("Answer");
  });
});

// ── stripOrphanedJS ─────────────────────────────────────────────────────────

describe("stripOrphanedJS", () => {
  it("removes contiguous blocks of 3+ JS-like lines", () => {
    const text = `Clean content here

// Don't play sentence audio by default
var elem = document.querySelector(".soundLink");
if (elem) { elem.click(); }`;

    const result = stripOrphanedJS(text);
    expect(result).toContain("Clean content here");
    expect(result).not.toContain("document.querySelector");
    expect(result).not.toContain("var elem");
  });

  it("preserves blocks with fewer than 3 JS-like lines", () => {
    const text = `Content
// just a comment
More content`;

    const result = stripOrphanedJS(text);
    expect(result).toContain("// just a comment");
  });

  it("strips large JS blocks with blank lines interspersed", () => {
    const text = `Card answer

// Script starts
var elem = document.querySelector(".foo");
if (elem) { elem.click(); }

function doThing() {
  document.getElementById("bar").innerHTML = "baz";
}`;

    const result = stripOrphanedJS(text);
    expect(result).toContain("Card answer");
    expect(result).not.toContain("querySelector");
    expect(result).not.toContain("getElementById");
  });

  it("preserves non-JS content completely", () => {
    const text =
      "This is normal flashcard content\n\nWith paragraphs\n\nAnd more text";
    expect(stripOrphanedJS(text)).toBe(text);
  });

  it("handles empty string", () => {
    expect(stripOrphanedJS("")).toBe("");
  });
});

// ── Bug fix regressions ─────────────────────────────────────────────────────

describe("Bug 2: whitespace normalization in htmlToMarkdown", () => {
  it("trims leading/trailing whitespace from each line", () => {
    const html = "<div>  <div>  Vatican City  </div>  </div>";
    const result = htmlToMarkdown(html);
    expect(result).not.toMatch(/^ +/m);
    expect(result).toContain("Vatican City");
  });

  it("collapses deeply nested div whitespace", () => {
    const html = `<div class="front">
    <div class="country">Vatican City</div>
    <div class="separator"><hr></div>
    <div class="question">
      <div class="type">Capital</div>
      <div class="prompt">?</div>
    </div>
  </div>`;

    const result = htmlToMarkdown(html);
    // Should not have lines with only spaces
    const lines = result.split("\n");
    for (const line of lines) {
      expect(line).toBe(line.trim());
    }
    expect(result).toContain("Vatican City");
    expect(result).toContain("Capital");
    expect(result).toContain("?");
  });

  it("removes tab characters from Anki template indentation", () => {
    const html = "<div>\t<span>content</span>\t</div>";
    const result = htmlToMarkdown(html);
    expect(result).not.toContain("\t");
    expect(result).toContain("content");
  });
});

describe("sanitizeHtml edge cases", () => {
  it("strips unclosed <script> tag content to end of string", () => {
    const html = '<div>safe</div><script>var x = 1; document.write("evil");';
    const result = sanitizeHtml(html);
    expect(result).toContain("safe");
    expect(result).not.toContain("var x");
    expect(result).not.toContain("document.write");
  });

  it("strips unclosed <style> tag content to end of string", () => {
    const html = "<div>safe</div><style>.card { color: red; }";
    const result = sanitizeHtml(html);
    expect(result).toContain("safe");
    expect(result).not.toContain("color");
  });

  it("handles <script> with attributes", () => {
    const html = '<script type="text/javascript">alert(1)</script>safe';
    expect(sanitizeHtml(html)).toBe("safe");
  });

  it("handles </script > with trailing whitespace", () => {
    const html = "<script>code</script >safe";
    expect(sanitizeHtml(html)).toBe("safe");
  });

  it("handles multiple <script> blocks", () => {
    const html = "<script>a()</script>middle<script>b()</script>end";
    const result = sanitizeHtml(html);
    expect(result).toBe("middleend");
  });
});
