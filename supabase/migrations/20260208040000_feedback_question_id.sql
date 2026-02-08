ALTER TABLE feedback ADD COLUMN question_id UUID REFERENCES questions(id) ON DELETE SET NULL;
CREATE INDEX idx_feedback_question_id ON feedback(question_id) WHERE question_id IS NOT NULL;

-- Drop unused question_reports table (all reports go through feedback table)
DROP TABLE IF EXISTS question_reports;
