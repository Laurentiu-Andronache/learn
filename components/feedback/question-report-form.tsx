'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';

interface QuestionReportFormProps {
  questionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuestionReportForm({ questionId, open, onOpenChange }: QuestionReportFormProps) {
  const [issueType, setIssueType] = useState('incorrect_answer');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('question_reports').insert({
        question_id: questionId,
        user_id: user?.id || null,
        issue_type: issueType,
        description: description.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setDescription('');
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Question Issue</DialogTitle>
        </DialogHeader>
        {submitted ? (
          <p className="text-center py-6 text-green-600 font-medium">Report submitted. Thank you!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incorrect_answer">Incorrect Answer</SelectItem>
                  <SelectItem value="typo">Typo</SelectItem>
                  <SelectItem value="unclear">Unclear</SelectItem>
                  <SelectItem value="outdated">Outdated</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue..." rows={3} required />
            </div>
            <Button type="submit" disabled={submitting || !description.trim()} className="w-full">
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
