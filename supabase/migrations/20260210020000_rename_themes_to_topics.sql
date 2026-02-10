-- ============================================
-- RENAME themes → topics EVERYWHERE
-- ============================================

-- 1. Drop RLS policies (before table rename)

DROP POLICY "Admins can delete themes" ON themes;
DROP POLICY "Admins can insert themes" ON themes;
DROP POLICY "Admins can update themes" ON themes;
DROP POLICY "Themes are viewable by everyone" ON themes;

DROP POLICY "Users can delete own hidden themes" ON hidden_themes;
DROP POLICY "Users can insert own hidden themes" ON hidden_themes;
DROP POLICY "Users can view own hidden themes" ON hidden_themes;

DROP POLICY "Admins can delete theme proposals" ON theme_proposals;
DROP POLICY "Admins can update theme proposals" ON theme_proposals;
DROP POLICY "Admins can view all theme proposals" ON theme_proposals;
DROP POLICY "Authenticated users can propose themes" ON theme_proposals;
DROP POLICY "Users can view own theme proposals" ON theme_proposals;

-- 2. Drop trigger

DROP TRIGGER update_themes_updated_at ON themes;

-- 3. Rename tables

ALTER TABLE themes RENAME TO topics;
ALTER TABLE hidden_themes RENAME TO hidden_topics;
ALTER TABLE theme_proposals RENAME TO topic_proposals;

-- 4. Rename columns

ALTER TABLE categories RENAME COLUMN theme_id TO topic_id;
ALTER TABLE hidden_topics RENAME COLUMN theme_id TO topic_id;
ALTER TABLE reading_progress RENAME COLUMN theme_id TO topic_id;
ALTER TABLE quiz_attempts RENAME COLUMN theme_id TO topic_id;

-- 5. Rename constraints

ALTER TABLE topics RENAME CONSTRAINT themes_pkey TO topics_pkey;
ALTER TABLE topics RENAME CONSTRAINT themes_creator_id_fkey TO topics_creator_id_fkey;

ALTER TABLE hidden_topics RENAME CONSTRAINT hidden_themes_pkey TO hidden_topics_pkey;
ALTER TABLE hidden_topics RENAME CONSTRAINT hidden_themes_theme_id_fkey TO hidden_topics_topic_id_fkey;
ALTER TABLE hidden_topics RENAME CONSTRAINT hidden_themes_user_id_fkey TO hidden_topics_user_id_fkey;
ALTER TABLE hidden_topics RENAME CONSTRAINT hidden_themes_user_id_theme_id_key TO hidden_topics_user_id_topic_id_key;

ALTER TABLE topic_proposals RENAME CONSTRAINT theme_proposals_pkey TO topic_proposals_pkey;
ALTER TABLE topic_proposals RENAME CONSTRAINT theme_proposals_reviewed_by_fkey TO topic_proposals_reviewed_by_fkey;
ALTER TABLE topic_proposals RENAME CONSTRAINT theme_proposals_status_check TO topic_proposals_status_check;
ALTER TABLE topic_proposals RENAME CONSTRAINT theme_proposals_submitted_by_fkey TO topic_proposals_submitted_by_fkey;

ALTER TABLE categories RENAME CONSTRAINT categories_theme_id_fkey TO categories_topic_id_fkey;
ALTER TABLE quiz_attempts RENAME CONSTRAINT quiz_attempts_theme_id_fkey TO quiz_attempts_topic_id_fkey;
ALTER TABLE reading_progress RENAME CONSTRAINT reading_progress_theme_id_fkey TO reading_progress_topic_id_fkey;

-- 6. Rename indexes

ALTER INDEX idx_categories_theme_id RENAME TO idx_categories_topic_id;
ALTER INDEX idx_hidden_themes_theme_id RENAME TO idx_hidden_topics_topic_id;
ALTER INDEX idx_hidden_themes_user RENAME TO idx_hidden_topics_user;
ALTER INDEX idx_quiz_attempts_user_theme RENAME TO idx_quiz_attempts_user_topic;
ALTER INDEX idx_reading_progress_theme_id RENAME TO idx_reading_progress_topic_id;
ALTER INDEX idx_theme_proposals_reviewed_by RENAME TO idx_topic_proposals_reviewed_by;
ALTER INDEX idx_theme_proposals_status RENAME TO idx_topic_proposals_status;
ALTER INDEX idx_theme_proposals_submitted_by RENAME TO idx_topic_proposals_submitted_by;

-- 7. Recreate RLS policies with new names

CREATE POLICY "Topics are viewable by everyone" ON topics FOR SELECT USING (true);
CREATE POLICY "Admins can insert topics" ON topics FOR INSERT WITH CHECK (is_admin((SELECT auth.uid())));
CREATE POLICY "Admins can update topics" ON topics FOR UPDATE USING (is_admin((SELECT auth.uid())));
CREATE POLICY "Admins can delete topics" ON topics FOR DELETE USING (is_admin((SELECT auth.uid())));

CREATE POLICY "Users can view own hidden topics" ON hidden_topics FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own hidden topics" ON hidden_topics FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own hidden topics" ON hidden_topics FOR DELETE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can view all topic proposals" ON topic_proposals FOR SELECT USING (is_admin((SELECT auth.uid())));
CREATE POLICY "Users can view own topic proposals" ON topic_proposals FOR SELECT USING ((SELECT auth.uid()) = submitted_by);
CREATE POLICY "Authenticated users can propose topics" ON topic_proposals FOR INSERT WITH CHECK ((SELECT auth.uid()) = submitted_by);
CREATE POLICY "Admins can update topic proposals" ON topic_proposals FOR UPDATE USING (is_admin((SELECT auth.uid())));
CREATE POLICY "Admins can delete topic proposals" ON topic_proposals FOR DELETE USING (is_admin((SELECT auth.uid())));

-- 8. Recreate trigger with new name

CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
