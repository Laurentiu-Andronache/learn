-- Add missing DELETE policies for admin review tables
CREATE POLICY "Admins can delete feedback"
  ON feedback FOR DELETE
  USING (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete question reports"
  ON question_reports FOR DELETE
  USING (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete proposed questions"
  ON proposed_questions FOR DELETE
  USING (is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete theme proposals"
  ON theme_proposals FOR DELETE
  USING (is_admin((SELECT auth.uid())));
