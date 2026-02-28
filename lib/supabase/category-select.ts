/** Shared PostgREST join selectors for the categories FK relationship. */
export const CATEGORY_JOIN_SELECT =
  "categories!inner(id, name_en, name_es, color, topic_id)" as const;
export const CATEGORY_TOPIC_ONLY_SELECT = "categories!inner(topic_id)" as const;

export interface CategoryJoin {
  id: string;
  name_en: string;
  name_es: string;
  color: string | null;
  topic_id: string;
}
