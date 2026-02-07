# LEARN NextJS App - Claude Code Instructions

## Project Overview

Production NextJS rewrite of the LEARN quiz/flashcard app with:
- **Stack**: NextJS 16 App Router + TypeScript + Tailwind + Supabase
- **Database**: PostgreSQL (Supabase) with 15 tables + RLS
- **Spaced Repetition**: FSRS algorithm for optimal review scheduling
- **Bilingual**: Full EN/ES support
- **Deployment**: Vercel (https://learn-app-theta-ten.vercel.app)

## Repository Structure

```
/home/nebu/la/learn/
├── learn.html          # Original prototype (reference only)
├── context/            # Reference materials
├── CLAUDE.md          # Prototype documentation
└── learn-app/         # ← THIS DIRECTORY (production app)
    ├── app/           # NextJS pages
    ├── lib/           # Utilities
    ├── supabase/      # Database migrations
    └── CLAUDE.md      # This file
```

## Database Migration Workflow

**IMPORTANT**: Claude Code is responsible for all database schema changes.

### When to Create a Migration

Create a new migration file when:
- Adding/removing tables
- Modifying table schemas (columns, constraints)
- Changing RLS policies
- Adding/removing indexes
- Creating/modifying functions

### Migration File Naming

```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

Example: `20260207000000_initial_schema.sql`

### Applying Migrations

**Current Status**: Migrations must be applied manually via Supabase Dashboard.

**Why automated migration doesn't work yet:**
- ❌ Direct database connection: Network unreachable from this environment
- ❌ Supabase CLI: Requires access token (get from https://supabase.com/dashboard/account/tokens)
- ❌ Management API: Requires personal access token

**Apply migrations manually:**
1. Open https://app.supabase.com/project/hqathtprnfdovjyrlyfb/sql/new
2. Copy migration from `supabase/migrations/YYYYMMDDHHMMSS_*.sql`
3. Paste and click **Run**
4. Verify success (should see "Success. No rows returned")

**To enable automation** (one-time setup):
1. Get Supabase access token: https://supabase.com/dashboard/account/tokens
2. Run: `npx supabase login` (paste token when prompted)
3. Run: `npx supabase link --project-ref hqathtprnfdovjyrlyfb`
4. Future migrations: `npx supabase db push`

## Supabase Project Details

- **Project**: learn (hqathtprnfdovjyrlyfb)
- **Region**: us-east-1
- **Dashboard**: https://app.supabase.com/project/hqathtprnfdovjyrlyfb
- **URL**: https://hqathtprnfdovjyrlyfb.supabase.co
- **Credentials**: Stored in `/home/nebu/la/learn/learn-app/.env.local` (not in git)

## Development Workflow

### Starting Work
```bash
cd /home/nebu/la/learn/learn-app
npm run dev  # http://localhost:3000
```

### Testing
- **Local test page**: http://localhost:3000/test-db
- **Production test page**: https://learn-app-theta-ten.vercel.app/test-db

### Deployment
```bash
git add -A
git commit -m "description"
git push  # Auto-deploys to Vercel
```

## Key Conventions

### Code Style
- Use TypeScript strict mode
- Server components by default (use 'use client' only when needed)
- Tailwind for all styling (no CSS modules)
- Supabase RLS for all data access (never bypass)

### Database Access
- **Client-side**: Use `createBrowserClient()` from `@supabase/ssr`
- **Server-side**: Use `createClient()` from `@/lib/supabase/server`
- **Never** use service role key in client components

### File Organization
- `/app/(route)/page.tsx` - Pages
- `/app/(route)/layout.tsx` - Layouts
- `/lib/` - Utilities, helpers, types
- `/components/` - Reusable React components (create as needed)

### Environment Variables
- `NEXT_PUBLIC_*` - Available client-side (public)
- Others - Server-side only (secret)
- All env vars configured in Vercel dashboard

## Database Schema Reference

15 tables organized as:

**Content (public read, admin write):**
- themes, categories, questions

**User Management:**
- profiles, admin_users

**FSRS Spaced Repetition:**
- user_card_state, review_logs

**User Preferences:**
- suspended_questions, hidden_themes, reading_progress

**Feedback & Moderation:**
- feedback, question_reports, proposed_questions, theme_proposals

Full schema in: `supabase/migrations/20260207000000_initial_schema.sql`

## Admin Access

Admin privileges managed via `admin_users` table:

```sql
-- Add admin user
INSERT INTO admin_users (email, granted_at)
VALUES ('email@example.com', NOW())
ON CONFLICT (email) DO NOTHING;
```

Admin check function: `is_admin(user_id UUID) RETURNS BOOLEAN`

## Next Development Steps

See README.md for detailed roadmap. High-level phases:

1. **Core Features**: Auth UI, FSRS integration, Quiz/Flashcard modes
2. **Content**: Port 53 vaccine questions, seed data
3. **Admin & Polish**: Admin panel, analytics, i18n

## Prototype Reference

Original single-file implementation: `/home/nebu/la/learn/learn.html`

Keep UX patterns from prototype:
- State machine flow (Language → Profile → Mode → Sub-mode → Session)
- Fisher-Yates shuffle for quiz options
- "I don't know" button
- Immediate feedback with explanations
- Per-question difficulty tracking
- Export/import progress

## Common Tasks

### Add a new table
1. Create migration file in `supabase/migrations/`
2. Include CREATE TABLE + RLS policies + indexes
3. Apply via dashboard/CLI
4. Update this CLAUDE.md schema reference

### Modify existing table
1. Create migration with ALTER statements
2. Update RLS policies if needed
3. Apply migration
4. Update affected TypeScript types

### Deploy changes
1. Commit to git
2. Push to main branch
3. Vercel auto-deploys
4. Verify at https://learn-app-theta-ten.vercel.app

## Troubleshooting

**Migration fails:**
- Check for syntax errors
- Verify table/column names don't conflict
- Ensure RLS policies reference valid tables

**Test page shows errors:**
- Verify .env.local has correct credentials
- Check Supabase dashboard for table existence
- Confirm admin_users has your email

**Build fails on Vercel:**
- Check TypeScript errors locally first
- Ensure all env vars set in Vercel dashboard
- Review build logs in Vercel dashboard
