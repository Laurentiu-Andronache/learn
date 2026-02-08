-- Fix: upsert requires UPDATE policy (INSERT ... ON CONFLICT DO UPDATE)
CREATE POLICY "Users can update own suspended questions"
  ON suspended_questions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
