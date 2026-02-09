-- Phase 2: Per-user FSRS settings on profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS desired_retention REAL DEFAULT 0.9
    CHECK (desired_retention BETWEEN 0.70 AND 0.97),
  ADD COLUMN IF NOT EXISTS max_review_interval INTEGER DEFAULT 36500
    CHECK (max_review_interval BETWEEN 1 AND 36500),
  ADD COLUMN IF NOT EXISTS new_cards_per_day INTEGER DEFAULT 20
    CHECK (new_cards_per_day BETWEEN 1 AND 999),
  ADD COLUMN IF NOT EXISTS show_review_time BOOLEAN DEFAULT true;
