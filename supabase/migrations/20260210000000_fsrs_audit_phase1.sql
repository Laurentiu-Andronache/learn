-- Phase 1: FSRS Audit — learning_steps persistence + undo snapshot columns

-- Bug 1: Persist learning_steps so cards don't reset to step 0 on reload
ALTER TABLE user_card_state
  ADD COLUMN IF NOT EXISTS learning_steps INTEGER NOT NULL DEFAULT 0;

-- Bug 3: Store full card-state-before snapshot in review_logs for accurate undo
ALTER TABLE review_logs
  ADD COLUMN IF NOT EXISTS state_before TEXT,
  ADD COLUMN IF NOT EXISTS reps_before INTEGER,
  ADD COLUMN IF NOT EXISTS lapses_before INTEGER,
  ADD COLUMN IF NOT EXISTS elapsed_days_before INTEGER,
  ADD COLUMN IF NOT EXISTS scheduled_days_before INTEGER,
  ADD COLUMN IF NOT EXISTS last_review_before TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_before TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS learning_steps_before INTEGER;
