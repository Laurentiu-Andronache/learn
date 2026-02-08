-- Make category_id nullable for theme-level reading progress (no category)
ALTER TABLE reading_progress ALTER COLUMN category_id DROP NOT NULL;

-- Drop constraint first (it depends on the index), then the index
ALTER TABLE reading_progress DROP CONSTRAINT IF EXISTS reading_progress_user_id_theme_id_category_id_key;
DROP INDEX IF EXISTS reading_progress_user_id_theme_id_category_id_key;
CREATE UNIQUE INDEX reading_progress_unique_idx
  ON reading_progress (user_id, theme_id, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'));
