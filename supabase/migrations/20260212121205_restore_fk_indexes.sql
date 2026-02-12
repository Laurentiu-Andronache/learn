-- Restore indexes that cover foreign keys (dropped as "unused" but still needed for FK coverage)
CREATE INDEX IF NOT EXISTS idx_admin_users_granted_by ON public.admin_users(granted_by);
CREATE INDEX IF NOT EXISTS idx_feedback_question_id ON public.feedback(question_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
