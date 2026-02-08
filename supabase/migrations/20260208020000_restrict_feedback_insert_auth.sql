-- Restrict feedback and question_reports INSERT to authenticated users only.
-- Previously these used WITH CHECK (true), allowing unauthenticated inserts.

-- feedback table
DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback;
CREATE POLICY "Authenticated users can submit feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- question_reports table
DROP POLICY IF EXISTS "Anyone can submit question reports" ON question_reports;
CREATE POLICY "Authenticated users can submit question reports"
  ON question_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
