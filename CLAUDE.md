# LEARN NextJS App

Purpose of this app: use the latest in learning science to help users excel in topics related to healthspan extension and cognitive improvement.

NextJS 16 App Router + TypeScript + Tailwind + Supabase | PostgreSQL (17 tables + RLS) | FSRS spaced repetition | EN/ES i18n | Vercel deploy

## Repo Structure

```
learn-app/
├── app/           # NextJS pages
├── components/    # React components
├── lib/           # Utilities, services, types
├── supabase/      # Database migrations
├── mcp-server/    # MCP content management server
├── CLAUDE.md      # This file
└── CLAUDE-supabase.md  # DB schema, migrations, admin access
```

## Dev Workflow

- Dev server: `npm run dev` on `:4000` (it should already be running)
- Tests: `npm run test` (Vitest)
- Deploy: `npm run build`; if it succeeds, then push to main → Vercel auto-deploys to https://learn-seven-peach.vercel.app
- All env vars must be configured in Vercel dashboard

## Architecture: Quiz vs Flashcard Split

**Flashcards** = primary study mode, recall-based, uses FSRS 4-point rating (Again/Hard/Good/Easy). Content in `flashcards` table. Progress tracked via `user_card_state` (flashcard_id FK) and `review_logs`.

**Quizzes** = recognition test, multiple choice, NO FSRS. Content in `questions` table. Results stored in `quiz_attempts` table. Simple score tracking.

Progress shown everywhere reflects **flashcard recall mastery** only. Quiz is an optional test.

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

| UI Term | DB Table | Route |
|---------|----------|-------|
| Topic | themes | /topics |
| Category | categories | — |
| Quiz Question | questions | /admin/quizzes |
| Flashcard | flashcards | /admin/flashcards |
| Quiz Attempt | quiz_attempts | — |
| Suspended Flashcard | suspended_flashcards | — |
| Hidden Topic | hidden_themes | — |
| Topic Proposal | theme_proposals | — |

Service functions use UI names (e.g. `createTopic`, `hideTopic`, `scheduleFlashcardReview`) but query DB table names internally.

## Key Routes

| Route | Description |
|-------|-------------|
| `/topics` | Topic grid (main browse) |
| `/topics/[id]` | Topic detail (recall progress + recognition test) |
| `/topics/[id]/quiz` | Quiz mode (recognition test, no FSRS) |
| `/topics/[id]/flashcards` | Flashcard mode (FSRS 4-point rating) |
| `/topics/[id]/reading` | Reading mode |
| `/admin/topics` | Admin topic management |
| `/admin/flashcards` | Admin flashcard CRUD |
| `/admin/quizzes` | Admin quiz question CRUD |
| `/settings` | User preferences |

## Component/Service Naming

- `components/topics/topic-card.tsx`, `topic-grid.tsx`
- `components/flashcards/` — flashcard session, stack (4-point grading), progress, results
- `components/quiz/` — quiz session, card, progress, results
- `components/admin/flashcard-edit-form.tsx` — flashcard editing form
- `components/admin/question-edit-form.tsx` — quiz question editing form
- `lib/fsrs/flashcard-ordering.ts` — `getOrderedFlashcards`, `getSubModeCounts`
- `lib/fsrs/actions.ts` — `scheduleFlashcardReview`, `buryFlashcard`, `undoLastReview`
- `lib/fsrs/interval-preview.ts` — client-side interval preview for rating buttons
- `lib/fsrs/progress.ts` — `getTopicProgress`, `getAllTopicsProgress` (flashcard-based)
- `lib/services/quiz-attempts.ts` — `saveQuizAttempt`, `getLatestQuizAttempt`
- `lib/services/user-preferences.ts` — `suspendFlashcard`, `hideTopic`, etc.

## Admin Editing (shared components)

- **Quiz question editing**: `components/admin/question-edit-form.tsx` — options, correct_index, bilingual
- **Flashcard editing**: `components/admin/flashcard-edit-form.tsx` — question/answer/extra, bilingual, difficulty
- **Reading/intro text editing**: `components/admin/topic-form.tsx` for full topic editing, `components/admin/reading-edit-dialog.tsx` for lightweight editing

## FSRS Flashcard Ordering (4-Bucket System)

In "full" flashcard mode, cards sort by priority buckets:
1. **Bucket 0**: Genuine review due (state=`review`/`relearning`, due now) — most overdue first
2. **Bucket 1**: New/unseen cards (no card state) — randomized
3. **Bucket 2**: Learning cards due (state=`learning`, short-term steps) — most overdue first
4. **Bucket 3**: Future cards (not yet due) — randomized

`spaced_repetition` sub-mode only shows bucket 0 cards. `quick_review` shows seen cards, max 20.

**Key insight**: Cards in FSRS "learning" state have short intervals (1-10 min). These must NOT be treated as genuine review-due cards.

## FSRS 4-Point Rating

Flashcard grading: Again (1, red) / Hard (2, orange) / Good (3, green) / Easy (4, blue). Keyboard hotkeys: 1/2/3/Space/4. Each button shows next interval preview. `enable_fuzz: true` in scheduler.

## Testing

Vitest configured with jsdom + @testing-library. Run: `npm run test`

| Test File | Tests | Covers |
|-----------|-------|--------|
| `lib/fsrs/__tests__/flashcard-ordering.test.ts` | 16 | 4-bucket sort, sub-mode filters, counts |
| `lib/fsrs/__tests__/question-ordering.test.ts` | 6 | Quiz question fetch, shuffle, category mapping |
| `lib/fsrs/__tests__/card-mapper.test.ts` | 26 | toCard/fromCard roundtrips, state mapping |
| `lib/fsrs/scheduler.test.ts` | 5 | FSRS scheduling integration |
| `lib/fsrs/card-mapper.test.ts` | 9 | Card mapping basics |
| `lib/services/__tests__/admin-reviews.test.ts` | 16 | CRUD, status updates, error handling |
| `lib/services/__tests__/user-preferences.test.ts` | 18 | Suspend flashcards, hide topics, reading progress, profiles |
| `components/quiz/quiz-logic.test.ts` | 18 | Shuffle, grading, results, retry |
| `components/flashcards/flashcard-logic.test.ts` | 17 | 4-point grading, stack advance, categories |

## UX Patterns

- Fisher-Yates shuffle for quiz options
- "I don't know" button in quiz
- 4-point FSRS rating buttons with interval previews in flashcards
- Immediate feedback with explanations
- Per-card difficulty tracking
- Quiz attempt history with retry failed

## Troubleshooting

- `admin_users` table must contain your email for admin access
- All env vars must be set in both `.env.local` and Vercel dashboard
- See `CLAUDE-supabase.md` for migration troubleshooting
- `proxy.ts` is the correct Next.js 16 convention (replaces `middleware.ts`)
