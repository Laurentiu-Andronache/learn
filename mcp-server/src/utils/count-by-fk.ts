/**
 * Maps aggregate count rows (from Supabase `.select("fk_col, count:id")`) into
 * a `{ [fk_value]: count }` record. Handles the double-cast needed because
 * Supabase returns `count` as a string.
 */
export function mapCountsByFK<K extends string>(rows: Array<Record<string, unknown>>, key: K): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const fk = row[key] as string;
    map[fk] = (row.count as number) || 0;
  }
  return map;
}
