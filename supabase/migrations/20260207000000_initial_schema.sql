-- ============================================================================
-- LEARN Database Schema - Initial Migration
-- ============================================================================
-- Complete schema for bilingual quiz/flashcard app with FSRS spaced repetition
-- Created: 2026-02-07
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CONTENT TABLES (Public Read, Admin Write)
-- ============================================================================

-- Themes: Top-level content groupings (e.g., "Vaccines & Longevity", "Spanish Grammar")
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_en TEXT,
  description_es TEXT,
  icon TEXT, -- Emoji or icon identifier
  color TEXT, -- Hex color for UI theming
  is_builtin BOOLEAN DEFAULT false, -- Distinguishes built-in vs user-created themes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories: Subject subdivisions within themes
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_es TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL-friendly identifier
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions: Individual quiz/flashcard items
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false')), -- Extendable to 'fill_blank', 'matching', etc.
  question_en TEXT NOT NULL,
  question_es TEXT NOT NULL,
  options_en JSONB, -- Array of answer choices (null for flashcards)
  options_es JSONB,
  correct_index INTEGER, -- Index of correct answer in options array (null for flashcards)
  explanation_en TEXT,
  explanation_es TEXT,
  extra_en TEXT, -- Deep-dive educational content (optional)
  extra_es TEXT,
  difficulty SMALLINT DEFAULT 5 CHECK (difficulty BETWEEN 1 AND 10), -- 1=easiest, 10=hardest
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER MANAGEMENT TABLES
-- ============================================================================

-- Profiles: Extended user data (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'es')),
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Users: Manages admin permissions independently
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SPACED REPETITION (FSRS) TABLES
-- ============================================================================

-- User Card State: FSRS scheduling parameters per user per question
CREATE TABLE user_card_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,

  -- FSRS core parameters
  stability REAL NOT NULL DEFAULT 1.0, -- Memory stability in days
  difficulty REAL NOT NULL DEFAULT 5.0, -- Item difficulty (0-10)
  elapsed_days INTEGER NOT NULL DEFAULT 0, -- Days since last review
  scheduled_days INTEGER NOT NULL DEFAULT 0, -- Days until next review
  reps INTEGER NOT NULL DEFAULT 0, -- Total review count
  lapses INTEGER NOT NULL DEFAULT 0, -- Times forgotten
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'relearning')),
  last_review TIMESTAMPTZ,
  due TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Next review date

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, question_id)
);

-- Review Logs: History of all review sessions
CREATE TABLE review_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  card_state_id UUID REFERENCES user_card_state(id) ON DELETE CASCADE,

  -- Review details
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4), -- 1=Again, 2=Hard, 3=Good, 4=Easy
  mode TEXT NOT NULL CHECK (mode IN ('quiz', 'flashcard')),
  answer_time_ms INTEGER, -- Time taken to answer
  was_correct BOOLEAN, -- For quiz mode

  -- FSRS state before review (for analytics)
  stability_before REAL,
  difficulty_before REAL,

  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER PREFERENCES TABLES
-- ============================================================================

-- Suspended Questions: Questions user wants to hide (too easy/hard)
CREATE TABLE suspended_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  reason TEXT, -- Optional: "too_easy", "too_hard", "irrelevant", etc.
  suspended_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, question_id)
);

-- Hidden Themes: Themes user doesn't want to see
CREATE TABLE hidden_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, theme_id)
);

-- ============================================================================
-- READING MODE TABLES
-- ============================================================================

-- Reading Progress: Tracks progress through educational content
CREATE TABLE reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,

  current_section INTEGER DEFAULT 0, -- Section/page number
  completion_percent SMALLINT DEFAULT 0 CHECK (completion_percent BETWEEN 0 AND 100),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, theme_id, category_id)
);

-- ============================================================================
-- FEEDBACK & MODERATION TABLES
-- ============================================================================

-- Feedback: General user feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous feedback
  type TEXT CHECK (type IN ('bug', 'feature', 'content', 'other')),
  message TEXT NOT NULL,
  url TEXT, -- Page where feedback was submitted
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question Reports: User-submitted quality issues
CREATE TABLE question_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('incorrect_answer', 'typo', 'unclear', 'outdated', 'other')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Proposed Questions: Community contributions
CREATE TABLE proposed_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  question_en TEXT NOT NULL,
  question_es TEXT NOT NULL,
  options_en JSONB,
  options_es JSONB,
  correct_index INTEGER,
  explanation_en TEXT,
  explanation_es TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Theme Proposals: User-submitted new themes
CREATE TABLE theme_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_en TEXT,
  description_es TEXT,
  sample_questions JSONB, -- Array of sample questions to demonstrate quality
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Themes & Categories
CREATE INDEX idx_categories_theme_id ON categories(theme_id);
CREATE INDEX idx_questions_category_id ON questions(category_id);

-- FSRS queries (due cards, recent reviews)
CREATE INDEX idx_user_card_state_user_due ON user_card_state(user_id, due);
CREATE INDEX idx_user_card_state_question ON user_card_state(question_id);
CREATE INDEX idx_review_logs_user_reviewed ON review_logs(user_id, reviewed_at DESC);

-- User preferences lookups
CREATE INDEX idx_suspended_questions_user ON suspended_questions(user_id);
CREATE INDEX idx_hidden_themes_user ON hidden_themes(user_id);

-- Moderation queues
CREATE INDEX idx_question_reports_status ON question_reports(status, created_at);
CREATE INDEX idx_proposed_questions_status ON proposed_questions(status, created_at);
CREATE INDEX idx_theme_proposals_status ON theme_proposals(status, created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspended_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposed_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_proposals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ADMIN HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = is_admin.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES - CONTENT TABLES (Public Read, Admin Write)
-- ============================================================================

-- Themes
CREATE POLICY "Themes are viewable by everyone"
  ON themes FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert themes"
  ON themes FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update themes"
  ON themes FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete themes"
  ON themes FOR DELETE
  USING (is_admin(auth.uid()));

-- Categories
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  USING (is_admin(auth.uid()));

-- Questions
CREATE POLICY "Questions are viewable by everyone"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert questions"
  ON questions FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update questions"
  ON questions FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete questions"
  ON questions FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES - USER MANAGEMENT
-- ============================================================================

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin Users
CREATE POLICY "Admins can view all admin users"
  ON admin_users FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can grant admin access"
  ON admin_users FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can revoke admin access"
  ON admin_users FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES - SPACED REPETITION DATA (Own Records Only)
-- ============================================================================

-- User Card State
CREATE POLICY "Users can view own card states"
  ON user_card_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card states"
  ON user_card_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card states"
  ON user_card_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Review Logs
CREATE POLICY "Users can view own review logs"
  ON review_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review logs"
  ON review_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - USER PREFERENCES (Own Records Only)
-- ============================================================================

-- Suspended Questions
CREATE POLICY "Users can view own suspended questions"
  ON suspended_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suspended questions"
  ON suspended_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own suspended questions"
  ON suspended_questions FOR DELETE
  USING (auth.uid() = user_id);

-- Hidden Themes
CREATE POLICY "Users can view own hidden themes"
  ON hidden_themes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hidden themes"
  ON hidden_themes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own hidden themes"
  ON hidden_themes FOR DELETE
  USING (auth.uid() = user_id);

-- Reading Progress
CREATE POLICY "Users can view own reading progress"
  ON reading_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading progress"
  ON reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress"
  ON reading_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - FEEDBACK (Public Insert, Admin Read)
-- ============================================================================

-- Feedback
CREATE POLICY "Anyone can submit feedback"
  ON feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Question Reports
CREATE POLICY "Anyone can submit question reports"
  ON question_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all question reports"
  ON question_reports FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update question reports"
  ON question_reports FOR UPDATE
  USING (is_admin(auth.uid()));

-- Proposed Questions
CREATE POLICY "Authenticated users can propose questions"
  ON proposed_questions FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can view own proposed questions"
  ON proposed_questions FOR SELECT
  USING (auth.uid() = submitted_by);

CREATE POLICY "Admins can view all proposed questions"
  ON proposed_questions FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update proposed questions"
  ON proposed_questions FOR UPDATE
  USING (is_admin(auth.uid()));

-- Theme Proposals
CREATE POLICY "Authenticated users can propose themes"
  ON theme_proposals FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can view own theme proposals"
  ON theme_proposals FOR SELECT
  USING (auth.uid() = submitted_by);

CREATE POLICY "Admins can view all theme proposals"
  ON theme_proposals FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update theme proposals"
  ON theme_proposals FOR UPDATE
  USING (is_admin(auth.uid()));

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at columns
CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_card_state_updated_at BEFORE UPDATE ON user_card_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL ADMIN USER (Add your email here)
-- ============================================================================

-- Insert first admin user (will be linked to auth.users after first login)
-- Note: This creates a placeholder that will be linked when the user signs up
INSERT INTO admin_users (email, granted_at)
VALUES ('laurentiu.andronache@gmail.com', NOW())
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Database ready for LEARN app development
-- Next steps:
-- 1. Seed initial content (themes, categories, questions)
-- 2. Test FSRS scheduling with ts-fsrs library
-- 3. Build authentication UI
-- ============================================================================
