# LEARN NextJS App

Purpose of this app: use the latest in learning science to help users excel in topics related to healthspan extension and cognitive improvement.

NextJS 16 App Router + TypeScript + Tailwind + Supabase | PostgreSQL (14 tables + RLS) | FSRS spaced repetition | EN/ES i18n | Vercel deploy

## Repo Structure

```
learn-app/
├── app/           # NextJS pages
├── components/    # React components
├── lib/           # Utilities, services, types
├── supabase/      # Database migrations
├── CLAUDE.md      # This file
└── CLAUDE-supabase.md  # DB schema, migrations, admin access
```

## Dev Workflow

- Dev server: `npm run dev` on `:4000`
- Test page: `/test-db` (local & prod)
- Deploy: push to main → Vercel auto-deploys to https://learn-app-theta-ten.vercel.app
- All env vars must be configured in Vercel dashboard

## Conventions

- Server components by default, `'use client'` only when needed
- Tailwind only (no CSS modules)
- RLS on all data access, never bypass
- Never use service role key in client components
- **Server**: `createClient()` from `@/lib/supabase/server`
- **Client**: `createBrowserClient()` from `@supabase/ssr`

## Terminology Mapping (UI → DB)

UI uses **Topics > Categories > Questions**. DB tables remain `themes`, `categories`, `questions`, `hidden_themes`, `theme_proposals`.

| UI Term | DB Table | Route |
|---------|----------|-------|
| Topic | themes | /topics |
| Category | categories | — |
| Question | questions | — |
| Hidden Topic | hidden_themes | — |
| Topic Proposal | theme_proposals | — |

Service functions use new names (e.g. `createTopic`, `hideTopic`) but query old DB table names internally.

## Key Routes

| Route | Description |
|-------|-------------|
| `/topics` | Topic grid (main browse) |
| `/topics/[id]` | Topic detail |
| `/topics/[id]/quiz` | Quiz mode |
| `/topics/[id]/flashcards` | Flashcard mode |
| `/topics/[id]/reading` | Reading mode |
| `/admin/topics` | Admin topic management |
| `/settings` | User preferences |

## Component/Service Naming

Components and services use "Topic" naming, DB queries use "theme" table names:
- `components/topics/topic-card.tsx`, `topic-grid.tsx`
- `components/settings/hidden-topics-list.tsx`
- `components/admin/topic-form.tsx`, `topic-actions.tsx`
- `lib/services/admin-topics.ts` — `createTopic`, `updateTopic`, `getAllTopics`
- `lib/services/user-preferences.ts` — `hideTopic`, `unhideTopic`, `getHiddenTopics`
- `lib/fsrs/progress.ts` — `getTopicProgress`, `getAllTopicsProgress`

## Dev Status

**Done**: Auth, FSRS, Quiz/Flashcard/Reading modes, Admin panel, i18n (EN/ES), content seeding.
**Next**: Analytics, community features, additional content.

## UX Patterns (from prototype)

- State machine flow (Language → Profile → Mode → Sub-mode → Session)
- Fisher-Yates shuffle for quiz options
- "I don't know" button
- Immediate feedback with explanations
- Per-question difficulty tracking
- Export/import progress

## Troubleshooting

- `admin_users` table must contain your email for admin access
- All env vars must be set in both `.env.local` and Vercel dashboard
- See `CLAUDE-supabase.md` for migration troubleshooting
