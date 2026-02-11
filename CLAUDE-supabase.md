# Supabase & Database Reference

## Project Details

- **Project**: learn (`hqathtprnfdovjyrlyfb`)
- **Region**: us-east-1
- **Dashboard**: https://app.supabase.com/project/hqathtprnfdovjyrlyfb
- **URL**: https://hqathtprnfdovjyrlyfb.supabase.co
- **Credentials**: `.env.local` (not in git) — requires `SUPABASE_ACCESS_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY`
- **Session Pooler**: `postgresql://postgres.hqathtprnfdovjyrlyfb:gEDjfl3ED%23%23@aws-1-us-east-1.pooler.supabase.com:5432/postgres`

## Migration Workflow

Claude Code is responsible for all schema changes.

**Naming**: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`

**Apply**: `npx supabase migration up --linked`
- Reads `SUPABASE_ACCESS_TOKEN` from `.env.local`, applies pending migrations in order

**Manual fallback**: https://app.supabase.com/project/hqathtprnfdovjyrlyfb/sql/new — paste and run

**Gotchas**:
- Always include RLS policies + indexes in migration files
- Update affected TypeScript types after schema changes
- Update `CLAUDE.md` table count / schema reference if tables added/removed

## Schema Reference (17 tables)

Full schema: `supabase/migrations/20260207000000_initial_schema.sql` + `20260209000000_split_quiz_flashcard.sql`

**Content** (public read, admin write): `topics`, `categories`, `questions`, `flashcards`

**User Management**: `profiles`, `admin_users`

**FSRS Spaced Repetition**: `user_card_state` (FK → flashcards), `review_logs` (FK → flashcards)

**Quiz**: `quiz_attempts` (user_id, topic_id, score, total, answers JSONB)

**User Preferences**: `suspended_flashcards`, `hidden_topics`, `reading_progress`

**Feedback & Moderation**: `feedback` (has `question_id` + `flashcard_id` FKs), `question_reports` (issue_type, status, admin_notes), `proposed_questions` (has `target_type`), `topic_proposals`

## Admin Access

Managed via `admin_users` table. Check function: `is_admin(user_id UUID) RETURNS BOOLEAN`

```sql
INSERT INTO admin_users (email, granted_at)
VALUES ('email@example.com', NOW())
ON CONFLICT (email) DO NOTHING;
```
