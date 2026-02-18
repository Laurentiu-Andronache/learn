/**
 * Strip duplicated question text from Anki-imported flashcard answers.
 * Anki uses `{{FrontSide}}<hr id=answer>{{Back}}`, so the answer markdown
 * starts with the question text + `\n---\n` + actual answer.
 */
export function stripFrontFromAnswer(answer: string, question: string): string {
  const sepIdx = answer.indexOf("\n---\n");
  if (sepIdx === -1) return answer;
  const before = answer.slice(0, sepIdx).trim();
  const after = answer.slice(sepIdx + 5).trim();
  const normQ = question.trim().replace(/\s+/g, " ");
  const normB = before.replace(/\s+/g, " ");
  if (normQ === normB || normB.startsWith(normQ) || normQ.startsWith(normB)) {
    return after || answer;
  }
  return answer;
}

const AUDIO_URL_RE = /\[audio\]\(([^)]+)\)/g;

/**
 * Detect when the extra field is a rearranged duplicate of the answer.
 * Common in Anki imports where both Back and Extra templates render
 * the same source fields in different orders.
 */
export function isExtraDuplicate(answer: string, extra: string): boolean {
  const answerUrls = new Set<string>();
  const extraUrls = new Set<string>();
  for (const m of answer.matchAll(AUDIO_URL_RE)) answerUrls.add(m[1]);
  for (const m of extra.matchAll(AUDIO_URL_RE)) extraUrls.add(m[1]);
  // If extra has audio links and ALL of them also appear in the answer → duplicate
  if (extraUrls.size > 0) {
    for (const url of extraUrls) {
      if (!answerUrls.has(url)) return false;
    }
    return true;
  }
  // Fallback: high word overlap check for non-audio duplicates
  const wordRe = /[a-zA-Z\u00C0-\u024F]{2,}/g;
  const answerWords = new Set((answer.toLowerCase().match(wordRe)) ?? []);
  const extraWords = (extra.toLowerCase().match(wordRe)) ?? [];
  if (extraWords.length === 0) return false;
  let overlap = 0;
  for (const w of extraWords) {
    if (answerWords.has(w)) overlap++;
  }
  return overlap / extraWords.length > 0.8;
}
