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

- Dev server: `npm run dev` on `:4000` (it should already be running)
- Tests: `npm run test` (Vitest, 118 tests across 8 files)
- Deploy: `npm run build`; if it succeeds, then push to main → Vercel auto-deploys to https://learn-seven-peach.vercel.app
- All env vars must be configured in Vercel dashboard

## SEO Implementation

All SEO features are implemented following Next.js App Router best practices:

**Files:**
- `app/robots.ts` - Blocks /admin, /auth, /settings from crawlers
- `app/sitemap.ts` - Dynamic sitemap with all public pages + topics
- `app/manifest.ts` - PWA manifest for installability
- `app/icon.tsx` - Dynamic favicon generator
- `app/apple-icon.tsx` - Apple touch icon generator
- `app/layout.tsx` - Full metadata with OG, Twitter Cards, canonical URLs
- `lib/seo/metadata-utils.ts` - Metadata helper functions
- `lib/seo/structured-data.ts` - JSON-LD schema generators
- `components/seo/structured-data.tsx` - Structured data components

**Key SEO Features:**
- Dynamic metadata for topic pages (/topics/[id])
- Dynamic OG images per topic (/topics/[id]/opengraph-image.tsx)
- Structured data: WebSite, WebPage, EducationalApplication schemas
- noindex on auth/admin pages
- hreflang tags for EN/ES
- Canonical URLs on all pages
- Sitemap includes all published topics

**Verification:**
- robots.txt: `/robots.txt`
- sitemap.xml: `/sitemap.xml`
- manifest: `/manifest.webmanifest`

## Conventions

- Server components by default, `'use client'` only when needed
- Tailwind only (no CSS modules)
- RLS on all data access, never bypass
- Never use service role key in client components
- **Server**: `createClient()` from `@/lib/supabase/server`
- **Client**: `createBrowserClient()` from `@supabase/ssr`
- **i18n**: Any user-facing text change must have corresponding keys in both `messages/en.json` and `messages/es.json`. Use `useTranslations()` (client) or `getTranslations()` (server) — never hardcode English strings.

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

## Admin Editing (shared components)

- **Question editing form**: `components/admin/question-edit-form.tsx` — single source of truth, used inline in Admin > Questions (`questions-client.tsx`), in Admin > Content Issues (`question-edit-dialog.tsx`), and in the session toolbar's Edit dialog during quiz/flashcard sessions.
- **Reading/intro text editing**: `components/admin/topic-form.tsx` for full topic editing (Admin > Topics > Edit), `components/admin/reading-edit-dialog.tsx` for lightweight intro text editing from Admin > Content Issues. The `intro_text_en`/`intro_text_es` fields on `themes` table hold the markdown rendered in Reading Mode.


## FSRS Question Ordering (4-Bucket System)

In "full" quiz/flashcard mode, questions sort by priority buckets:
1. **Bucket 0**: Genuine review due (state=`review`/`relearning`, due now) — most overdue first
2. **Bucket 1**: New/unseen cards (no card state) — randomized
3. **Bucket 2**: Learning cards due (state=`learning`, short-term steps) — most overdue first
4. **Bucket 3**: Future cards (not yet due) — randomized

`spaced_repetition` sub-mode only shows bucket 0 cards. `quick_review` shows seen cards, max 20.

**Key insight**: Cards in FSRS "learning" state have short intervals (1-10 min). These must NOT be treated as genuine review-due cards, or users re-see questions they just answered.

## Testing

Vitest configured with jsdom + @testing-library. Run: `npm run test`

| Test File | Tests | Covers |
|-----------|-------|--------|
| `lib/fsrs/__tests__/question-ordering.test.ts` | 16 | 4-bucket sort, sub-mode filters, counts |
| `lib/fsrs/__tests__/card-mapper.test.ts` | 26 | toCard/fromCard roundtrips, state mapping |
| `lib/fsrs/scheduler.test.ts` | 5 | FSRS scheduling integration |
| `lib/fsrs/card-mapper.test.ts` | 9 | Card mapping basics |
| `lib/services/__tests__/admin-reviews.test.ts` | 16 | CRUD, status updates, error handling |
| `lib/services/__tests__/user-preferences.test.ts` | 18 | Suspend/hide, reading progress, profiles |
| `components/quiz/quiz-logic.test.ts` | 17 | Shuffle, grading, results, review-missed |
| `components/flashcards/flashcard-logic.test.ts` | 11 | Grading, stack advance, categories |

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
- `proxy.ts` is the correct Next.js 16 convention (replaces `middleware.ts`)
