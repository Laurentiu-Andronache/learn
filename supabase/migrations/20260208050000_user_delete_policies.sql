-- Allow users to delete their own card states and review logs.
-- Fixes: undoLastReview() silently failed on .delete() calls due to missing policies.
-- Enables: resetTodayProgress(), resetAllProgress()

CREATE POLICY "Users can delete own card states"
  ON user_card_state FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own review logs"
  ON review_logs FOR DELETE USING (auth.uid() = user_id);
