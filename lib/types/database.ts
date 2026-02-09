// Database types for all tables
// Auto-mirrors: supabase/migrations/20260209000000_split_quiz_flashcard.sql

// ============================================================================
// CONTENT TABLES
// ============================================================================

export type QuestionType = "multiple_choice" | "true_false";

export interface Topic {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  icon: string | null;
  color: string | null;
  creator_id: string | null;
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

/** Quiz questions (multiple choice / true-false recognition tests) */
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

/** Flashcards (recall-based FSRS items) */
export interface Flashcard {
  id: string;
  category_id: string;
  question_en: string;
  question_es: string;
  answer_en: string;
  answer_es: string;
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
  desired_retention: number | null;
  max_review_interval: number | null;
  new_cards_per_day: number | null;
  show_review_time: boolean | null;
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
// SPACED REPETITION (FSRS) — flashcards only
// ============================================================================

export type CardState = "new" | "learning" | "review" | "relearning";
export type FSRSRating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface UserCardState {
  id: string;
  user_id: string;
  flashcard_id: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: CardState;
  last_review: string | null;
  due: string;
  learning_steps: number;
  times_correct: number;
  times_incorrect: number;
  times_idk: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewLog {
  id: string;
  user_id: string;
  flashcard_id: string;
  card_state_id: string;
  rating: FSRSRating;
  answer_time_ms: number | null;
  was_correct: boolean | null;
  stability_before: number | null;
  difficulty_before: number | null;
  state_before: CardState | null;
  reps_before: number | null;
  lapses_before: number | null;
  elapsed_days_before: number | null;
  scheduled_days_before: number | null;
  last_review_before: string | null;
  due_before: string | null;
  learning_steps_before: number | null;
  reviewed_at: string;
}

// ============================================================================
// QUIZ ATTEMPTS
// ============================================================================

export interface QuizAttemptAnswer {
  question_id: string;
  selected_index: number | null;
  was_correct: boolean;
  time_ms: number;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  theme_id: string;
  score: number;
  total: number;
  answers: QuizAttemptAnswer[];
  completed_at: string;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export interface SuspendedFlashcard {
  id: string;
  user_id: string;
  flashcard_id: string;
  reason: string | null;
  suspended_at: string;
}

export interface HiddenTopic {
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
export type ProposalStatus = "pending" | "approved" | "rejected";

export interface Feedback {
  id: string;
  user_id: string | null;
  type: FeedbackType | null;
  message: string;
  name: string | null;
  email: string | null;
  question_id: string | null;
  flashcard_id: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
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
  target_type: "question" | "flashcard";
  status: ProposalStatus;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface TopicProposal {
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

export type TopicInsert = Omit<Topic, "id" | "created_at" | "updated_at"> & {
  id?: string;
};
export type CategoryInsert = Omit<Category, "id" | "created_at"> & {
  id?: string;
};
export type QuestionInsert = Omit<
  Question,
  "id" | "created_at" | "updated_at"
> & { id?: string };
export type FlashcardInsert = Omit<
  Flashcard,
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
export type QuizAttemptInsert = Omit<QuizAttempt, "id" | "completed_at"> & {
  id?: string;
};

// ============================================================================
// UPDATE TYPES (all fields optional except id)
// ============================================================================

export type TopicUpdate = Partial<
  Omit<Topic, "id" | "created_at" | "updated_at">
>;
export type QuestionUpdate = Partial<
  Omit<Question, "id" | "created_at" | "updated_at">
>;
export type FlashcardUpdate = Partial<
  Omit<Flashcard, "id" | "created_at" | "updated_at">
>;
export type ProfileUpdate = Partial<
  Omit<Profile, "id" | "created_at" | "updated_at">
>;
export type UserCardStateUpdate = Partial<
  Omit<
    UserCardState,
    "id" | "user_id" | "flashcard_id" | "created_at" | "updated_at"
  >
>;
