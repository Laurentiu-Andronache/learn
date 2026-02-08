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
- Tests: `npm run test` (Vitest, 123 tests across 8 files)
- Test page: `/test-db` (local only — **SECURITY: must gate behind dev check or remove before prod**)
- Deploy: push to main → Vercel auto-deploys to https://learn-seven-peach.vercel.app
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
| `lib/services/__tests__/admin-reviews.test.ts` | 21 | CRUD, status updates, error handling |
| `lib/services/__tests__/user-preferences.test.ts` | 18 | Suspend/hide, reading progress, profiles |
| `components/quiz/quiz-logic.test.ts` | 17 | Shuffle, grading, results, review-missed |
| `components/flashcards/flashcard-logic.test.ts` | 11 | Grading, stack advance, categories |

## Dev Status

**Done**: Auth, FSRS, Quiz/Flashcard/Reading modes, Admin panel, i18n (EN/ES), content seeding, unit tests (123).
**Next**: Analytics, community features, additional content.

## Known Issues & Tech Debt (from Feb 2026 audit)

### Critical — Fix Before Production
- **Open redirect** in `app/auth/confirm/route.ts:10` — `next` param passed to `redirect()` unvalidated
- **`/test-db` exposes data** via service role key — gate behind dev check or remove
- **No middleware.ts** — `proxy.ts` exists but is dead code; auth/session refresh not centralized
- **Server actions lack app-layer auth** — admin actions in `admin-topics.ts`, `admin-reviews.ts` rely solely on RLS
- **Fire-and-forget `scheduleReview()`** — errors silently lost in quiz/flashcard sessions

### High — Performance & Quality
- **N+1 in `getAllTopicsProgress()`** — 3 queries per topic (10 topics = 30 queries); batch-fetch instead
- **Duplicate theme fetch** in `app/topics/[id]/page.tsx` — `generateMetadata()` and page component both query
- **Sequential queries** in `question-ordering.ts:51-63` and `progress.ts` — use `Promise.all()`
- **5x `as any` casts** on Supabase returns — add proper types
- **`updateStatus()` accepts arbitrary table name** — restrict to union type

### Medium — i18n & UX
- **30 files with hardcoded English** — translation keys often exist but aren't imported (worst: about page, flashcard components, theme switcher)
- **FlashcardStack double-render** — duplicate `currentIndex` state with parent
- **Confetti effect** in quiz-results lacks rAF cleanup on unmount
- **Client-side themeId filtering** in `getQuestionsList` — move to DB query
- **Feedback/question_reports INSERT** allows unauthenticated — restrict to `auth.uid() IS NOT NULL`

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
