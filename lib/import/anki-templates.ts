/**
 * Anki template rendering and HTML-to-markdown conversion.
 *
 * Handles Mustache-like field substitution, cloze expansion,
 * multi-template generation, HTML sanitization, and markdown conversion.
 */

import type { AnkiModel } from "./anki-types";

// ── Sanitization ──

/** Remove dangerous HTML content before further processing. */
export function sanitizeHtml(html: string): string {
  let s = html;
  // Remove <script>, <style>, <link>, <iframe>, <object>, <embed> tags + content
  // First pass: paired tags with closing counterpart
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");
  // Second pass: unclosed script/style tags (content extends to end of string)
  s = s.replace(/<script\b[^>]*>[\s\S]*$/gi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*$/gi, "");
  s = s.replace(/<link[^>]*\/?>/gi, "");
  s = s.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "");
  s = s.replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, "");
  s = s.replace(/<embed[^>]*\/?>/gi, "");
  // Remove on* event handlers from any remaining tags
  s = s.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Remove javascript: URLs
  s = s.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href=""');
  s = s.replace(/href\s*=\s*'javascript:[^']*'/gi, "href=''");
  s = s.replace(/src\s*=\s*"javascript:[^"]*"/gi, 'src=""');
  s = s.replace(/src\s*=\s*'javascript:[^']*'/gi, "src=''");
  return s;
}

// ── Orphaned JavaScript Stripping ──

/**
 * Detect lines that look like JavaScript code.
 * Used to strip script content that survived HTML sanitization
 * (e.g., from unclosed <script> tags in Anki templates).
 */
const JS_LINE_RE =
  /^(?:\/\/.*|(?:var|let|const|function)\s|(?:document|window)\.|if\s*\(|else\s*\{|}\s*[;)]*$|\)\s*;?\s*$|.*\.(?:querySelector|getElementById|addEventListener|innerHTML|createElement|click)\()/;

/** Strip contiguous blocks of orphaned JavaScript code from text. */
export function stripOrphanedJS(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let block: string[] = [];
  let jsCount = 0;

  const flush = () => {
    // Keep blocks with fewer than 3 JS lines (likely not a real JS block)
    if (jsCount < 3) result.push(...block);
    block = [];
    jsCount = 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && JS_LINE_RE.test(trimmed)) {
      block.push(line);
      jsCount++;
    } else if (trimmed === "" && block.length > 0) {
      // Blank line within a potential JS block
      block.push(line);
    } else {
      flush();
      result.push(line);
    }
  }
  flush();
  return result.join("\n");
}

// ── HTML → Markdown ──

/** Decode common HTML entities. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

/** Convert an HTML table to a simplified markdown table. */
function convertTable(tableHtml: string): string {
  const rows: string[][] = [];
  // Match each <tr> and extract <td>/<th> contents
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(tableHtml)) !== null) {
    const cells: string[] = [];
    const tdRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      // Strip remaining tags within cells
      cells.push(tdMatch[1].replace(/<[^>]*>/g, "").trim());
    }
    if (cells.length > 0) rows.push(cells);
  }

  if (rows.length === 0) return "";

  const maxCols = Math.max(...rows.map((r) => r.length));
  // Pad rows to uniform width
  const padded = rows.map((r) => {
    while (r.length < maxCols) r.push("");
    return r;
  });

  const lines: string[] = [];
  padded.forEach((row, i) => {
    lines.push("| " + row.join(" | ") + " |");
    if (i === 0) {
      lines.push("| " + row.map(() => "---").join(" | ") + " |");
    }
  });
  return lines.join("\n");
}

/** Convert Anki HTML content to clean markdown. */
export function htmlToMarkdown(html: string): string {
  let s = html;

  // [sound:file.mp3] → [audio](file.mp3)
  s = s.replace(/\[sound:([^\]]+)\]/g, "[audio]($1)");

  // Tables → markdown tables (before stripping other tags)
  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, inner) =>
    convertTable(inner),
  );

  // <br>, <br/>, <br /> → newline
  s = s.replace(/<br\s*\/?>/gi, "\n");

  // <hr> → markdown rule
  s = s.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Lists
  s = s.replace(/<\/li>\s*/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "- ");
  s = s.replace(/<\/?[ou]l[^>]*>/gi, "\n");

  // <img src="file"> → ![](file)
  s = s.replace(/<img[^>]*src\s*=\s*"([^"]*)"[^>]*>/gi, "![]($1)");
  s = s.replace(/<img[^>]*src\s*=\s*'([^']*)'[^>]*>/gi, "![]($1)");

  // <a href="url">text</a> → [text](url)
  s = s.replace(
    /<a[^>]*href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    "[$2]($1)",
  );
  s = s.replace(
    /<a[^>]*href\s*=\s*'([^']*)'[^>]*>([\s\S]*?)<\/a>/gi,
    "[$2]($1)",
  );

  // <b>, <strong> → **text**
  s = s.replace(/<(?:b|strong)[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi, "**$1**");
  // <i>, <em> → *text*
  s = s.replace(/<(?:i|em)[^>]*>([\s\S]*?)<\/(?:i|em)>/gi, "*$1*");

  // <u> → just the text (no markdown equivalent)
  s = s.replace(/<\/?u[^>]*>/gi, "");

  // <sub>, <sup> → just the text
  s = s.replace(/<\/?su[bp][^>]*>/gi, "");

  // Block elements → ensure line breaks
  s = s.replace(/<\/(?:div|p|blockquote|h[1-6])[^>]*>/gi, "\n");
  s = s.replace(/<(?:div|p|blockquote)[^>]*>/gi, "");

  // Headings: <h1>–<h6> → markdown
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) => {
    return "#".repeat(Number(level)) + " " + text.trim();
  });

  // Strip all remaining HTML tags
  s = s.replace(/<[^>]*>/g, "");

  // Decode HTML entities
  s = decodeEntities(s);

  // Clean up whitespace: trim each line, collapse blank lines
  s = s
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

// ── Template Field Substitution ──

/**
 * Render an Anki template string by substituting {{FieldName}} placeholders
 * with values from the fields map.
 *
 * Supports: basic fields, {{FrontSide}}, {{type:Field}}, {{hint:Field}},
 * conditional blocks {{#Field}}...{{/Field}}, inverted {{^Field}}...{{/Field}},
 * and unknown prefixes {{xxx:Field}}.
 */
export function renderTemplate(
  template: string,
  fields: Record<string, string>,
  frontSide?: string,
): string {
  let result = template;

  // Conditional blocks: {{#Field Name}}content{{/Field Name}}
  // Field names can contain spaces, so we match [^}]+ instead of \w+
  // Process nested conditionals by iterating until stable
  let prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(
      /\{\{#([^}]+?)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_, field, content) => {
        const val = fields[field] ?? "";
        return val.trim() ? content : "";
      },
    );
  }

  // Inverted conditional blocks: {{^Field Name}}content{{/Field Name}}
  prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(
      /\{\{\^([^}]+?)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_, field, content) => {
        const val = fields[field] ?? "";
        return val.trim() ? "" : content;
      },
    );
  }

  // {{FrontSide}} → rendered front template
  result = result.replace(/\{\{FrontSide\}\}/g, frontSide ?? "");

  // {{type:FieldName}} → field value (Anki typing input, we just show value)
  result = result.replace(/\{\{type:([^}]+?)\}\}/g, (_, field) => {
    return fields[field] ?? "";
  });

  // {{hint:FieldName}} → spoiler-like format
  result = result.replace(/\{\{hint:([^}]+?)\}\}/g, (_, field) => {
    const val = fields[field] ?? "";
    return val.trim() ? `(${val})` : "";
  });

  // {{unknown_prefix:FieldName}} → field value
  result = result.replace(/\{\{\w+:([^}]+?)\}\}/g, (_, field) => {
    return fields[field] ?? "";
  });

  // {{FieldName}} → field value (exclude # / ^ prefixes already handled)
  result = result.replace(/\{\{([^}#/^]+?)\}\}/g, (_, field) => {
    return fields[field] ?? "";
  });

  return result;
}

// ── Cloze Expansion ──

/** Regex matching a single cloze deletion: {{c1::text}} or {{c1::text::hint}} */
const CLOZE_RE = /\{\{c(\d+)::([^}]*?)(?:::([^}]*?))?\}\}/g;

/**
 * Expand a cloze note into one flashcard per cloze number.
 *
 * For cloze number N:
 * - Front: {{cN::text}} → `[...]` or `[hint]`; other cloze numbers → revealed text
 * - Back: all cloze deletions → revealed text
 */
export function expandCloze(text: string): { front: string; back: string }[] {
  // Discover which cloze numbers exist
  const numbers = new Set<number>();
  let m: RegExpExecArray | null;
  const re = new RegExp(CLOZE_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    numbers.add(Number(m[1]));
  }

  if (numbers.size === 0) return [];

  const sorted = Array.from(numbers).sort((a, b) => a - b);

  // Back is the same for all cards: all cloze deletions revealed
  const back = text.replace(CLOZE_RE, (_, _n, answer) => answer);

  return sorted.map((n) => {
    const front = text.replace(CLOZE_RE, (_, num, answer, hint) => {
      if (Number(num) === n) {
        return hint ? `[${hint}]` : "[...]";
      }
      return answer;
    });
    return { front, back };
  });
}

// ── Multi-Template Expansion ──

/**
 * Generate flashcards from a note's fields and its model's templates.
 *
 * Standard notes (type 0): one card per template with non-empty front+back.
 * Cloze notes (type 1): use first template + cloze expansion.
 */
export function expandTemplates(
  fields: Record<string, string>,
  model: {
    type: number;
    tmpls: { name: string; ord: number; qfmt: string; afmt: string }[];
  },
  frontSideOverride?: string,
): { front: string; back: string; templateName: string }[] {
  if (model.type === 1) {
    // Cloze model — use first template
    const tmpl = model.tmpls[0];
    if (!tmpl) return [];

    const renderedQ = renderTemplate(tmpl.qfmt, fields, frontSideOverride);
    const clozeCards = expandCloze(renderedQ);

    if (clozeCards.length === 0) return [];

    return clozeCards.map((card, i) => {
      // For the back, render the answer template with FrontSide = card.front
      const renderedBack = renderTemplate(tmpl.afmt, fields, card.front);
      // Expand cloze in the back as well (reveal all)
      const backRevealed = renderedBack.replace(
        CLOZE_RE,
        (_, _n, answer) => answer,
      );
      return {
        front: card.front,
        back: backRevealed,
        templateName: `${tmpl.name} (c${i + 1})`,
      };
    });
  }

  // Standard model — one card per template
  const results: { front: string; back: string; templateName: string }[] = [];

  for (const tmpl of model.tmpls) {
    const front = renderTemplate(tmpl.qfmt, fields, frontSideOverride);

    // Skip if front is empty after stripping HTML tags
    const frontText = front.replace(/<[^>]*>/g, "").trim();
    if (!frontText) continue;

    const back = renderTemplate(tmpl.afmt, fields, front);
    const backText = back.replace(/<[^>]*>/g, "").trim();
    if (!backText) continue;

    results.push({ front, back, templateName: tmpl.name });
  }

  return results;
}

// ── Main Processing Function ──

/**
 * Convert a raw Anki note into one or more flashcard data objects.
 *
 * Steps: build field map → sanitize → expand templates → HTML→markdown → build extra.
 */
export function processNoteToFlashcards(
  fields: string[],
  fieldNames: string[],
  model: AnkiModel,
  _tags: string[],
): { front: string; back: string; extra: string; templateName: string }[] {
  // 1. Build fieldName → value map
  const fieldMap: Record<string, string> = {};
  for (let i = 0; i < fieldNames.length; i++) {
    fieldMap[fieldNames[i]] = fields[i] ?? "";
  }

  // 2. Sanitize all field values
  for (const key of Object.keys(fieldMap)) {
    fieldMap[key] = sanitizeHtml(fieldMap[key]);
  }

  // 3. Expand templates → rendered HTML front/back per card
  //    Sanitize templates (qfmt/afmt) before rendering to strip <script>/<style>
  //    blocks from the template itself, not just from field values.
  const expanded = expandTemplates(fieldMap, {
    type: model.type,
    tmpls: model.tmpls.map((t) => ({
      name: t.name,
      ord: t.ord,
      qfmt: sanitizeHtml(t.qfmt),
      afmt: sanitizeHtml(t.afmt),
    })),
  });

  // 4. Convert to markdown + build extra from fields beyond the first two
  const extraFields = fieldNames
    .slice(2)
    .map((name) => fieldMap[name] ?? "")
    .filter((v) => v.trim());
  const extraMarkdown = stripOrphanedJS(
    extraFields.map((f) => htmlToMarkdown(f)).join("\n\n"),
  );

  return expanded.map((card) => ({
    front: stripOrphanedJS(htmlToMarkdown(sanitizeHtml(card.front))),
    back: stripOrphanedJS(htmlToMarkdown(sanitizeHtml(card.back))),
    extra: extraMarkdown,
    templateName: card.templateName,
  }));
}
