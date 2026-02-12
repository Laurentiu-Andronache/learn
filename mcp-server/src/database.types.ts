// Supabase Database type for createClient<Database>() generic.
// Gives typed .from() / .select() / .insert() / .update() results.

export type Database = {
  public: {
    Tables: {
      topics: {
        Row: {
          id: string
          title_en: string
          title_es: string
          description_en: string | null
          description_es: string | null
          icon: string | null
          color: string | null
          creator_id: string | null
          intro_text_en: string | null
          intro_text_es: string | null
          is_active: boolean
          slug: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title_en: string
          title_es: string
          description_en?: string | null
          description_es?: string | null
          icon?: string | null
          color?: string | null
          creator_id?: string | null
          intro_text_en?: string | null
          intro_text_es?: string | null
          is_active?: boolean
          slug?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title_en?: string
          title_es?: string
          description_en?: string | null
          description_es?: string | null
          icon?: string | null
          color?: string | null
          creator_id?: string | null
          intro_text_en?: string | null
          intro_text_es?: string | null
          is_active?: boolean
          slug?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          topic_id: string
          name_en: string
          name_es: string
          slug: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          name_en: string
          name_es: string
          slug: string
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          topic_id?: string
          name_en?: string
          name_es?: string
          slug?: string
          color?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          id: string
          category_id: string
          type: string
          question_en: string
          question_es: string
          options_en: string[] | null
          options_es: string[] | null
          correct_index: number | null
          explanation_en: string | null
          explanation_es: string | null
          extra_en: string | null
          extra_es: string | null
          difficulty: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          type: string
          question_en: string
          question_es: string
          options_en?: string[] | null
          options_es?: string[] | null
          correct_index?: number | null
          explanation_en?: string | null
          explanation_es?: string | null
          extra_en?: string | null
          extra_es?: string | null
          difficulty?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          type?: string
          question_en?: string
          question_es?: string
          options_en?: string[] | null
          options_es?: string[] | null
          correct_index?: number | null
          explanation_en?: string | null
          explanation_es?: string | null
          extra_en?: string | null
          extra_es?: string | null
          difficulty?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          id: string
          category_id: string
          question_en: string
          question_es: string
          answer_en: string
          answer_es: string
          extra_en: string | null
          extra_es: string | null
          difficulty: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          question_en: string
          question_es: string
          answer_en: string
          answer_es: string
          extra_en?: string | null
          extra_es?: string | null
          difficulty?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          question_en?: string
          question_es?: string
          answer_en?: string
          answer_es?: string
          extra_en?: string | null
          extra_es?: string | null
          difficulty?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          preferred_language: string
          is_anonymous: boolean
          desired_retention: number | null
          max_review_interval: number | null
          new_cards_per_day: number | null
          new_cards_ramp_up: boolean | null
          show_review_time: boolean | null
          base_font_size: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          preferred_language?: string
          is_anonymous?: boolean
          desired_retention?: number | null
          max_review_interval?: number | null
          new_cards_per_day?: number | null
          new_cards_ramp_up?: boolean | null
          show_review_time?: boolean | null
          base_font_size?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          preferred_language?: string
          is_anonymous?: boolean
          desired_retention?: number | null
          max_review_interval?: number | null
          new_cards_per_day?: number | null
          new_cards_ramp_up?: boolean | null
          show_review_time?: boolean | null
          base_font_size?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          id: string
          user_id: string
          email: string
          granted_by: string | null
          granted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          granted_by?: string | null
          granted_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          granted_by?: string | null
          granted_at?: string
        }
        Relationships: []
      }
      user_card_state: {
        Row: {
          id: string
          user_id: string
          flashcard_id: string
          stability: number
          difficulty: number
          elapsed_days: number
          scheduled_days: number
          reps: number
          lapses: number
          state: string
          last_review: string | null
          due: string
          learning_steps: number
          times_correct: number
          times_incorrect: number
          times_idk: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flashcard_id: string
          stability?: number
          difficulty?: number
          elapsed_days?: number
          scheduled_days?: number
          reps?: number
          lapses?: number
          state?: string
          last_review?: string | null
          due?: string
          learning_steps?: number
          times_correct?: number
          times_incorrect?: number
          times_idk?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          flashcard_id?: string
          stability?: number
          difficulty?: number
          elapsed_days?: number
          scheduled_days?: number
          reps?: number
          lapses?: number
          state?: string
          last_review?: string | null
          due?: string
          learning_steps?: number
          times_correct?: number
          times_incorrect?: number
          times_idk?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_card_state_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      review_logs: {
        Row: {
          id: string
          user_id: string
          flashcard_id: string
          card_state_id: string
          rating: number
          answer_time_ms: number | null
          was_correct: boolean | null
          stability_before: number | null
          difficulty_before: number | null
          state_before: string | null
          reps_before: number | null
          lapses_before: number | null
          elapsed_days_before: number | null
          scheduled_days_before: number | null
          last_review_before: string | null
          due_before: string | null
          learning_steps_before: number | null
          reviewed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flashcard_id: string
          card_state_id: string
          rating: number
          answer_time_ms?: number | null
          was_correct?: boolean | null
          stability_before?: number | null
          difficulty_before?: number | null
          state_before?: string | null
          reps_before?: number | null
          lapses_before?: number | null
          elapsed_days_before?: number | null
          scheduled_days_before?: number | null
          last_review_before?: string | null
          due_before?: string | null
          learning_steps_before?: number | null
          reviewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          flashcard_id?: string
          card_state_id?: string
          rating?: number
          answer_time_ms?: number | null
          was_correct?: boolean | null
          stability_before?: number | null
          difficulty_before?: number | null
          state_before?: string | null
          reps_before?: number | null
          lapses_before?: number | null
          elapsed_days_before?: number | null
          scheduled_days_before?: number | null
          last_review_before?: string | null
          due_before?: string | null
          learning_steps_before?: number | null
          reviewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_logs_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          score: number
          total: number
          answers: unknown
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_id: string
          score: number
          total: number
          answers: unknown
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          score?: number
          total?: number
          answers?: unknown
          completed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          id: string
          user_id: string | null
          type: string | null
          message: string
          name: string | null
          email: string | null
          question_id: string | null
          flashcard_id: string | null
          url: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type?: string | null
          message: string
          name?: string | null
          email?: string | null
          question_id?: string | null
          flashcard_id?: string | null
          url?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string | null
          message?: string
          name?: string | null
          email?: string | null
          question_id?: string | null
          flashcard_id?: string | null
          url?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      question_reports: {
        Row: {
          id: string
          question_id: string
          user_id: string | null
          issue_type: string
          description: string
          status: string
          admin_notes: string | null
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          question_id: string
          user_id?: string | null
          issue_type: string
          description: string
          status?: string
          admin_notes?: string | null
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          question_id?: string
          user_id?: string | null
          issue_type?: string
          description?: string
          status?: string
          admin_notes?: string | null
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      proposed_questions: {
        Row: {
          id: string
          category_id: string
          submitted_by: string | null
          type: string
          target_type: string | null
          question_en: string
          question_es: string
          options_en: string[] | null
          options_es: string[] | null
          correct_index: number | null
          explanation_en: string | null
          explanation_es: string | null
          status: string
          admin_notes: string | null
          created_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          category_id: string
          submitted_by?: string | null
          type: string
          target_type?: string | null
          question_en: string
          question_es: string
          options_en?: string[] | null
          options_es?: string[] | null
          correct_index?: number | null
          explanation_en?: string | null
          explanation_es?: string | null
          status?: string
          admin_notes?: string | null
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          category_id?: string
          submitted_by?: string | null
          type?: string
          target_type?: string | null
          question_en?: string
          question_es?: string
          options_en?: string[] | null
          options_es?: string[] | null
          correct_index?: number | null
          explanation_en?: string | null
          explanation_es?: string | null
          status?: string
          admin_notes?: string | null
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposed_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_proposals: {
        Row: {
          id: string
          submitted_by: string | null
          title_en: string
          title_es: string
          description_en: string | null
          description_es: string | null
          sample_questions: unknown | null
          status: string
          admin_notes: string | null
          created_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          submitted_by?: string | null
          title_en: string
          title_es: string
          description_en?: string | null
          description_es?: string | null
          sample_questions?: unknown | null
          status?: string
          admin_notes?: string | null
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          submitted_by?: string | null
          title_en?: string
          title_es?: string
          description_en?: string | null
          description_es?: string | null
          sample_questions?: unknown | null
          status?: string
          admin_notes?: string | null
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      suspended_flashcards: {
        Row: {
          id: string
          user_id: string
          flashcard_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flashcard_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          flashcard_id?: string
          created_at?: string
        }
        Relationships: []
      }
      hidden_topics: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          created_at?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_id: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience aliases
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
