/**
 * Generate a URL for a topic, preferring slug when available.
 */
export function topicUrl(
  topic: { id: string; slug?: string | null },
  sub?: string,
): string {
  const base = `/topics/${topic.slug || topic.id}`;
  return sub ? `${base}/${sub}` : base;
}
