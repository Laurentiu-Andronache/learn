// Database types for all 15 tables
// Auto-mirrors: supabase/migrations/20260207000000_initial_schema.sql
//             + supabase/migrations/20260207020000_schema_additions.sql

// ============================================================================
// CONTENT TABLES
// ============================================================================

export type QuestionType = "multiple_choice" | "true_false";

export interface Theme {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  icon: string | null;
  color: string | null;
  is_builtin: boolean;
  intro_text_en: string | null;
  intro_text_es: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  theme_id: string;
  name_en: string;
  name_es: string;
  slug: string;
  color: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  category_id: string;
  type: QuestionType;
  question_en: string;
  question_es: string;
  options_en: string[] | null;
  options_es: string[] | null;
  correct_index: number | null;
  explanation_en: string | null;
  explanation_es: string | null;
  extra_en: string | null;
  extra_es: string | null;
  difficulty: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export type Language = "en" | "es";

export interface Profile {
  id: string;
  display_name: string | null;
  preferred_language: Language;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  granted_by: string | null;
  granted_at: string;
}

// ============================================================================
// SPACED REPETITION (FSRS)
// ============================================================================

export type CardState = "new" | "learning" | "review" | "relearning";
export type FSRSRating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
export type ReviewMode = "quiz" | "flashcard";

export interface UserCardState {
  id: string;
  user_id: string;
  question_id: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: CardState;
  last_review: string | null;
  due: string;
  times_correct: number;
  times_incorrect: number;
  times_idk: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewLog {
  id: string;
  user_id: string;
  question_id: string;
  card_state_id: string;
  rating: FSRSRating;
  mode: ReviewMode;
  answer_time_ms: number | null;
  was_correct: boolean | null;
  stability_before: number | null;
  difficulty_before: number | null;
  reviewed_at: string;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export interface SuspendedQuestion {
  id: string;
  user_id: string;
  question_id: string;
  reason: string | null;
  suspended_at: string;
}

export interface HiddenTheme {
  id: string;
  user_id: string;
  theme_id: string;
  hidden_at: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  theme_id: string;
  category_id: string;
  current_section: number;
  completion_percent: number;
  last_read_at: string;
}

// ============================================================================
// FEEDBACK & MODERATION
// ============================================================================

export type FeedbackType = "bug" | "feature" | "content" | "other";
export type IssueType =
  | "incorrect_answer"
  | "typo"
  | "unclear"
  | "outdated"
  | "other";
export type ModerationStatus =
  | "pending"
  | "reviewing"
  | "resolved"
  | "dismissed";
export type ProposalStatus = "pending" | "approved" | "rejected";

export interface Feedback {
  id: string;
  user_id: string | null;
  type: FeedbackType | null;
  message: string;
  url: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface QuestionReport {
  id: string;
  question_id: string;
  user_id: string | null;
  issue_type: IssueType;
  description: string;
  status: ModerationStatus;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface ProposedQuestion {
  id: string;
  category_id: string;
  submitted_by: string | null;
  type: string;
  question_en: string;
  question_es: string;
  options_en: string[] | null;
  options_es: string[] | null;
  correct_index: number | null;
  explanation_en: string | null;
  explanation_es: string | null;
  status: ProposalStatus;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface ThemeProposal {
  id: string;
  submitted_by: string | null;
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  sample_questions: Record<string, unknown>[] | null;
  status: ProposalStatus;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

// ============================================================================
// INSERT TYPES (omit server-generated fields)
// ============================================================================

export type ThemeInsert = Omit<Theme, "id" | "created_at" | "updated_at"> & {
  id?: string;
};
export type CategoryInsert = Omit<Category, "id" | "created_at"> & {
  id?: string;
};
export type QuestionInsert = Omit<
  Question,
  "id" | "created_at" | "updated_at"
> & { id?: string };
export type ProfileInsert = Omit<Profile, "created_at" | "updated_at">;
export type UserCardStateInsert = Omit<
  UserCardState,
  "id" | "created_at" | "updated_at"
> & { id?: string };
export type ReviewLogInsert = Omit<ReviewLog, "id" | "reviewed_at"> & {
  id?: string;
};

// ============================================================================
// UPDATE TYPES (all fields optional except id)
// ============================================================================

export type ThemeUpdate = Partial<
  Omit<Theme, "id" | "created_at" | "updated_at">
>;
export type QuestionUpdate = Partial<
  Omit<Question, "id" | "created_at" | "updated_at">
>;
export type ProfileUpdate = Partial<
  Omit<Profile, "id" | "created_at" | "updated_at">
>;
export type UserCardStateUpdate = Partial<
  Omit<
    UserCardState,
    "id" | "user_id" | "question_id" | "created_at" | "updated_at"
  >
>;
