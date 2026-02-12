-- ============================================
-- 1. Fix function search_path (security)
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.email = au.email
    WHERE u.id = $1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ============================================
-- 2. Fix RLS initplan (wrap bare auth.uid())
--    + merge multiple permissive SELECT policies
-- ============================================

-- admin_users: merge 2 SELECT policies into 1
DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admin_users;
CREATE POLICY "View admin users" ON public.admin_users
  FOR SELECT USING (
    is_admin((select auth.uid()))
    OR email = ((select auth.jwt()) ->> 'email')
  );

-- feedback: merge 2 SELECT into 1 + fix initplan on INSERT
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "View feedback" ON public.feedback
  FOR SELECT USING (
    is_admin((select auth.uid()))
    OR (select auth.uid()) = user_id
  );

DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.feedback;
CREATE POLICY "Authenticated users can submit feedback" ON public.feedback
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- flashcards: fix initplan on 3 admin policies
DROP POLICY IF EXISTS "Admins can delete flashcards" ON public.flashcards;
CREATE POLICY "Admins can delete flashcards" ON public.flashcards
  FOR DELETE USING (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can insert flashcards" ON public.flashcards;
CREATE POLICY "Admins can insert flashcards" ON public.flashcards
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can update flashcards" ON public.flashcards;
CREATE POLICY "Admins can update flashcards" ON public.flashcards
  FOR UPDATE USING (is_admin((select auth.uid())));

-- proposed_questions: merge 2 SELECT into 1
DROP POLICY IF EXISTS "Admins can view all proposed questions" ON public.proposed_questions;
DROP POLICY IF EXISTS "Users can view own proposed questions" ON public.proposed_questions;
CREATE POLICY "View proposed questions" ON public.proposed_questions
  FOR SELECT USING (
    is_admin((select auth.uid()))
    OR (select auth.uid()) = submitted_by
  );

-- quiz_attempts: merge 2 SELECT into 1 + fix initplan on INSERT
DROP POLICY IF EXISTS "Admins can view all quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "View quiz attempts" ON public.quiz_attempts
  FOR SELECT USING (
    is_admin((select auth.uid()))
    OR (select auth.uid()) = user_id
  );

DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can insert own quiz attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- review_logs: fix initplan on DELETE
DROP POLICY IF EXISTS "Users can delete own review logs" ON public.review_logs;
CREATE POLICY "Users can delete own review logs" ON public.review_logs
  FOR DELETE USING ((select auth.uid()) = user_id);

-- suspended_flashcards: fix initplan on all 4 policies
DROP POLICY IF EXISTS "Users can delete own suspended flashcards" ON public.suspended_flashcards;
CREATE POLICY "Users can delete own suspended flashcards" ON public.suspended_flashcards
  FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own suspended flashcards" ON public.suspended_flashcards;
CREATE POLICY "Users can insert own suspended flashcards" ON public.suspended_flashcards
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own suspended flashcards" ON public.suspended_flashcards;
CREATE POLICY "Users can update own suspended flashcards" ON public.suspended_flashcards
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own suspended flashcards" ON public.suspended_flashcards;
CREATE POLICY "Users can view own suspended flashcards" ON public.suspended_flashcards
  FOR SELECT USING ((select auth.uid()) = user_id);

-- topic_proposals: merge 2 SELECT into 1
DROP POLICY IF EXISTS "Admins can view all topic proposals" ON public.topic_proposals;
DROP POLICY IF EXISTS "Users can view own topic proposals" ON public.topic_proposals;
CREATE POLICY "View topic proposals" ON public.topic_proposals
  FOR SELECT USING (
    is_admin((select auth.uid()))
    OR (select auth.uid()) = submitted_by
  );

-- user_card_state: fix initplan on DELETE
DROP POLICY IF EXISTS "Users can delete own card states" ON public.user_card_state;
CREATE POLICY "Users can delete own card states" ON public.user_card_state
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================
-- 3. Add missing FK indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_feedback_flashcard_id ON public.feedback(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic_id ON public.quiz_attempts(topic_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_flashcard_id ON public.review_logs(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_suspended_flashcards_flashcard_id ON public.suspended_flashcards(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_topics_creator_id ON public.topics(creator_id);

-- ============================================
-- 4. Drop unused indexes
-- ============================================

DROP INDEX IF EXISTS public.idx_admin_users_user_id;
DROP INDEX IF EXISTS public.idx_admin_users_granted_by;
DROP INDEX IF EXISTS public.idx_user_card_state_user_due;
DROP INDEX IF EXISTS public.idx_reading_progress_user_id;
DROP INDEX IF EXISTS public.idx_feedback_user_id;
DROP INDEX IF EXISTS public.idx_feedback_question_id;
DROP INDEX IF EXISTS public.idx_quiz_attempts_completed;
-- Keeping idx_topics_slug (useful as traffic grows)
