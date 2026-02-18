/**
 * Converts {{term|explanation}} syntax in markdown to tooltip-flavored links.
 * Code blocks and inline code are left untouched.
 */
export function preprocessTooltips(markdown: string): string {
  // Split into code segments (preserved) and text segments (processed)
  const segments = markdown.split(/(```[\s\S]*?```|`[^`]+`)/);

  return segments
    .map((segment, i) => {
      // Odd indices are code blocks/inline code — skip
      if (i % 2 === 1) return segment;
      // Replace {{term|explanation}} with [term](tooltip "explanation")
      return segment.replace(
        /\{\{([^|]+?)\|(.+?)\}\}/g,
        (match, term: string, explanation: string) => {
          if (!term.trim() || !explanation.trim()) return match;
          const escaped = explanation.replace(/"/g, "&quot;");
          return `[${term}](tooltip "${escaped}")`;
        },
      );
    })
    .join("");
}
