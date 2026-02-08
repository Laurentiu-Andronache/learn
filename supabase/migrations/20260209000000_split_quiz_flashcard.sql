-- ============================================================================
-- Split Quiz & Flashcard Architecture
-- ============================================================================
-- Separate flashcards (FSRS recall) from quiz questions (recognition test)
-- New tables: flashcards, quiz_attempts, suspended_flashcards
-- Migrates FSRS state from questions → flashcards
-- Resets all user progress (TRUNCATE card states + review logs)
-- ============================================================================

-- ============================================================================
-- 1. CREATE flashcards TABLE
-- ============================================================================

CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  question_en TEXT NOT NULL,
  question_es TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  answer_es TEXT NOT NULL,
  extra_en TEXT,
  extra_es TEXT,
  difficulty SMALLINT DEFAULT 5 CHECK (difficulty BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flashcards_category_id ON flashcards(category_id);

-- Updated_at trigger
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flashcards are viewable by everyone"
  ON flashcards FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert flashcards"
  ON flashcards FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update flashcards"
  ON flashcards FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete flashcards"
  ON flashcards FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================================
-- 2. CREATE quiz_attempts TABLE
-- ============================================================================

CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  answers JSONB NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_user_theme ON quiz_attempts(user_id, theme_id);
CREATE INDEX idx_quiz_attempts_completed ON quiz_attempts(completed_at DESC);

-- RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================================================
-- 3. CREATE suspended_flashcards TABLE
-- ============================================================================

CREATE TABLE suspended_flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE,
  reason TEXT,
  suspended_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, flashcard_id)
);

CREATE INDEX idx_suspended_flashcards_user ON suspended_flashcards(user_id);

-- RLS
ALTER TABLE suspended_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suspended flashcards"
  ON suspended_flashcards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suspended flashcards"
  ON suspended_flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own suspended flashcards"
  ON suspended_flashcards FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own suspended flashcards"
  ON suspended_flashcards FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. POPULATE flashcards FROM questions (preserve UUIDs)
-- ============================================================================

INSERT INTO flashcards (id, category_id, question_en, question_es, answer_en, answer_es, extra_en, extra_es, difficulty, created_at, updated_at)
SELECT
  id,
  category_id,
  question_en,
  question_es,
  COALESCE(explanation_en, ''),
  COALESCE(explanation_es, ''),
  extra_en,
  extra_es,
  difficulty,
  created_at,
  updated_at
FROM questions;

-- ============================================================================
-- 5. MIGRATE user_card_state: question_id → flashcard_id
-- ============================================================================

-- Add new column
ALTER TABLE user_card_state ADD COLUMN flashcard_id UUID;

-- Copy data
UPDATE user_card_state SET flashcard_id = question_id;

-- Drop old constraint and column
ALTER TABLE user_card_state DROP CONSTRAINT IF EXISTS user_card_state_question_id_fkey;
ALTER TABLE user_card_state DROP CONSTRAINT IF EXISTS user_card_state_user_id_question_id_key;
DROP INDEX IF EXISTS idx_user_card_state_question;
ALTER TABLE user_card_state DROP COLUMN question_id;

-- Add new constraints
ALTER TABLE user_card_state ALTER COLUMN flashcard_id SET NOT NULL;
ALTER TABLE user_card_state ADD CONSTRAINT user_card_state_flashcard_id_fkey
  FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE;
ALTER TABLE user_card_state ADD CONSTRAINT user_card_state_user_id_flashcard_id_key
  UNIQUE (user_id, flashcard_id);
CREATE INDEX idx_user_card_state_flashcard ON user_card_state(flashcard_id);

-- ============================================================================
-- 6. MIGRATE review_logs: question_id → flashcard_id, drop mode
-- ============================================================================

-- Add new column
ALTER TABLE review_logs ADD COLUMN flashcard_id UUID;

-- Copy data
UPDATE review_logs SET flashcard_id = question_id;

-- Drop old column and constraints
ALTER TABLE review_logs DROP CONSTRAINT IF EXISTS review_logs_question_id_fkey;
ALTER TABLE review_logs DROP COLUMN question_id;
ALTER TABLE review_logs DROP COLUMN mode;

-- Add new constraint
ALTER TABLE review_logs ALTER COLUMN flashcard_id SET NOT NULL;
ALTER TABLE review_logs ADD CONSTRAINT review_logs_flashcard_id_fkey
  FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE;

-- ============================================================================
-- 7. ALTER feedback: add flashcard_id FK
-- ============================================================================

ALTER TABLE feedback ADD COLUMN flashcard_id UUID REFERENCES flashcards(id) ON DELETE SET NULL;

-- ============================================================================
-- 8. ALTER proposed_questions: add target_type
-- ============================================================================

ALTER TABLE proposed_questions ADD COLUMN target_type TEXT DEFAULT 'flashcard'
  CHECK (target_type IN ('question', 'flashcard'));

-- ============================================================================
-- 9. DROP suspended_questions TABLE
-- ============================================================================

-- First migrate any existing suspended questions to suspended_flashcards
INSERT INTO suspended_flashcards (user_id, flashcard_id, reason, suspended_at)
SELECT user_id, question_id, reason, suspended_at
FROM suspended_questions
ON CONFLICT (user_id, flashcard_id) DO NOTHING;

DROP TABLE suspended_questions;

-- ============================================================================
-- 10. RESET ALL USER PROGRESS
-- ============================================================================

TRUNCATE user_card_state CASCADE;
TRUNCATE review_logs;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
