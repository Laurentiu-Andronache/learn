# LEARN NextJS App

Purpose of this app: use the latest in learning science to help users excel in topics related to healthspan extension and cognitive improvement.

NextJS 16 App Router + TypeScript + Tailwind + Supabase | PostgreSQL (17 tables + RLS) | FSRS spaced repetition | EN/ES i18n | Vercel deploy

## Repo Structure

```
learn-app/
├── app/           # NextJS pages + API routes
├── components/    # React components
├── hooks/         # Custom React hooks (use-tts, use-auto-translate)
├── lib/           # Utilities, services, types
├── supabase/      # Database migrations
├── mcp-server/    # MCP content management server
├── CLAUDE.md      # This file
├── CLAUDE-supabase.md  # DB schema, migrations, admin access
└── CLAUDE-content-creation.md  # Flashcard/quiz/reading content rules
```

## Dev Workflow

- Dev server: `npm run dev` on `:4000` (it should already be running)
- Tests: `npm run test` (Vitest)
- Deploy: `npm run build`; if it succeeds, then push to main → Vercel auto-deploys to https://learn.gift
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

## Profile Auto-Creation

DB trigger `on_auth_user_created` (`handle_new_user()`) auto-creates a `profiles` row for every new `auth.users` entry (including anonymous). All profile writes can assume the row exists.

## DB Naming

DB tables use `topics`, `hidden_topics`, `topic_proposals` — matching UI terminology directly. No mapping needed.

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

`[id]` accepts both UUIDs and slugs. Topics with a `slug` column set get friendly URLs (e.g. `/topics/vaccines`). UUID URLs auto-redirect to slug URLs when a slug exists.

## Topic Slug System

- `topics.slug` — optional unique column for SEO-friendly URLs
- `lib/topics/resolve-topic.ts` — `resolveTopic(param)` / `resolveTopicSelect(param, select)` detect UUID vs slug and query accordingly
- `lib/topics/topic-url.ts` — `topicUrl(topic, sub?)` generates URLs preferring slug over id
- All `app/topics/[id]/*` pages use resolve helpers + canonical redirect (UUID→slug)
- Admin topic form has slug field with auto-generate from English title

## Glossary Tooltips

`{{term|explanation}}` syntax renders hover/tap tooltips on technical terms. Supported in **reading mode, flashcard answers/extras, and quiz explanations/extras**. Authoring rules in `CLAUDE-content-creation.md`.

- `lib/markdown/preprocess-tooltips.ts` — converts `{{term|explanation}}` → `[term](tooltip "explanation")`, skips code blocks and inline code
- `components/reading/glossary-term.tsx` — controlled Tooltip (hover + tap toggle), dotted underline + cursor-help
- `components/shared/markdown-content.tsx` — reusable ReactMarkdown + tooltip renderer (used by reading-view, flashcard-stack, quiz-card)

## Text-to-Speech (Click-to-Read)

Users click/tap any paragraph in reading mode, flashcard answers/extras, or quiz explanations/extras to hear it read aloud via ElevenLabs. No visible buttons — study tips dialog tells users to "tap any paragraph."

**Architecture**: Client click → `useTTS` hook → browser Cache API check → `POST /api/tts` → Supabase Storage cache check → ElevenLabs SDK → cache & return audio.

**Files:**
- `app/api/tts/route.ts` — API route: auth, rate limit (30/min/user), raw fetch for Supabase Storage (bypasses SDK + Next.js fetch patching), `after()` for upload, ~200ms silent MP3 prefix for anti-clipping
- `hooks/use-tts.ts` — Client hook: browser Cache API, Audio playback, pause/resume, state via refs
- `components/shared/markdown-content.tsx` — TTSContext + stable module-level `markdownComponents` constant (prevents React remounting TTSBlock on re-render, preserving ref identity for pause/resume)
- `components/reading/glossary-term.tsx` — `e.stopPropagation()` prevents TTS when clicking tooltip terms

**ElevenLabs config**: Voice Matilda (`XrExE9yKIg1WjnnlVkGX`), model `eleven_multilingual_v2`, `outputFormat: "mp3_44100_128"`, narration-optimized voice settings (stability 0.7, similarityBoost 0.5).

**Anti-clipping**: Server-side ~200ms silent MP3 prepended to ALL audio responses (both cached and fresh). Deterministic fix for ElevenLabs first-word clipping bug — model-independent, unlike text-based workarounds (`previousText`, SSML `<break>`).

**Caching**: Two layers — browser Cache API (`tts-audio-v1`) for instant replay, Supabase Storage bucket (`tts-audio`) for cross-device/cross-session persistence. Cache key = SHA-256 of `voiceId:text`. Upload uses `after()` from `next/server` (runs after response sent with kept-alive context) + raw `fetch` with `cache: "no-store"`. Uses `LEARN_SERVICE_ROLE_KEY` env var (falls back to `SUPABASE_SERVICE_ROLE_KEY`) to avoid collision with `~/.bashrc` which exports the Launcher project's service role key.

**Pause/resume**: Works via stable component identity. `markdownComponents` is a module-level constant → ReactMarkdown always sees same component references → React reconciles TTSBlock in place → `useRef` persists → DOM element identity preserved → `playingElRef.current === el` succeeds on second click. Previous bug: inline `components={{...}}` created new function references each render → React unmounted/remounted TTSBlock → new refs → identity comparison always failed.

**Env vars**: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `LEARN_SERVICE_ROLE_KEY` — set in both `.env.local` and Vercel dashboard.

**Animation**: Static `bg-[hsl(var(--primary)/0.10)]` highlight on playing paragraph (no pulse/flash).

**Auto-Read Questions**: `read_questions_aloud` profile setting (default false). When enabled, questions are auto-read via `handleBlockClick(ref)` on appear. Quiz: auto-read on question change + click question to pause/resume. Flashcard: auto-read on front side, stop on flip (no click-to-control — would conflict with card flip handler). Setting in `/settings` study settings card.

## Topic Visibility

`topics.visibility` column: `"public"` (default/NULL) or `"private"` (creator-only). Admin toggle at `/admin/topics` via `components/admin/topic-visibility-toggle.tsx` + `toggleTopicVisibility` server action. RLS enforces visibility across `topics`, `categories`, `flashcards`, and `questions` — private content is invisible to non-creator/non-admin users at the DB level.

## Component/Service Naming

- `lib/topics/resolve-topic.ts` — `resolveTopic`, `resolveTopicSelect`, `isUuidParam`
- `lib/topics/topic-url.ts` — `topicUrl(topic, sub?)`
- `components/topics/topic-card.tsx`, `topic-grid.tsx`
- `components/flashcards/` — flashcard session, stack (4-point grading), progress, results
- `components/quiz/` — quiz session, card, progress, results
- `components/admin/flashcard-edit-form.tsx` — flashcard editing form
- `components/admin/question-edit-form.tsx` — quiz question editing form
- `lib/fsrs/flashcard-ordering.ts` — `getOrderedFlashcards`, `getSubModeCounts` (supports `newCardsPerDay` enforcement)
- `lib/fsrs/actions.ts` — `scheduleFlashcardReview`, `buryFlashcard`, `undoLastReview`, `resetTodayProgress` (uses per-user scheduler + snapshot-based undo)
- `lib/fsrs/scheduler.ts` — FSRS singleton + `createUserScheduler()` factory for per-user retention/interval settings
- `lib/fsrs/interval-preview.ts` — `getIntervalPreviews()` (accepts optional user settings), `getRetrievability()`, `formatInterval()`
- `lib/fsrs/daily-stats.ts` — `getDailyStats()` (reviews today, new cards, correct rate, due tomorrow)
- `lib/fsrs/progress.ts` — `getTopicProgress`, `getAllTopicsProgress` (flashcard-based)
- `lib/services/quiz-attempts.ts` — `saveQuizAttempt`, `getLatestQuizAttempt`
- `lib/services/user-preferences.ts` — `suspendFlashcard`, `hideTopic`, `getFsrsSettings`, `updateFsrsSettings`, etc.
- `components/settings/fsrs-settings.tsx` — Study settings card (retention slider, max interval, ramp-up toggle, new cards/day, show intervals)
- `components/topics/study-tips-dialog.tsx` — First-visit study tips popup (localStorage-gated)
- `hooks/use-tts.ts` — TTS click-to-read hook (browser cache, Audio playback, pause/resume)
- `app/api/tts/route.ts` — TTS API route (auth, rate limit, Supabase Storage cache, ElevenLabs)
- `lib/fsrs/optimizer.ts` — `optimizeUserParameters()`, `transformReviewLogs()`
- `components/admin/topic-visibility-toggle.tsx` — Public/Private switch for admin topics list
- `lib/services/admin-topics.ts` — `toggleTopicVisibility` server action

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

Bucket 1 (new cards) respects `newCardsPerDay` setting — queries `review_logs` for today's new-card reviews (where `stability_before IS NULL`) and caps accordingly.

**Key insight**: Cards in FSRS "learning" state have short intervals (1-10 min). These must NOT be treated as genuine review-due cards.

## FSRS 4-Point Rating

Flashcard grading: Again (1, red) / Hard (2, orange) / Good (3, green) / Easy (4, blue). Keyboard hotkeys: 1/2/3/Space/4. Each button shows next interval preview (controlled by `show_review_time` user setting). `enable_fuzz: true` in scheduler.

## Per-User FSRS Settings

Stored in `profiles` table: `desired_retention` (0.70-0.97, default 0.9), `max_review_interval` (1-36500, default 36500), `new_cards_per_day` (1-999, default 10), `new_cards_ramp_up` (default true), `show_review_time` (default true), `read_questions_aloud` (default false), `base_font_size` (12-18, default 14), `fsrs_weights` (JSONB, default NULL), `fsrs_weights_updated_at` (timestamptz, default NULL).

**Ramp-up**: When `new_cards_ramp_up` is true, new cards are capped at `5 + dayNumber` for the first 5 days of a topic (6/7/8/9/10), then `new_cards_per_day`. Day number is calculated from the user's earliest review log for that topic's flashcards.

**Text Size**: `base_font_size` overrides Tailwind's `text-sm` via CSS variable `--text-sm` on `<html>`. Cookie is the source of truth (works for anonymous/guest users without DB); DB is a backup for cross-device sync. Cookie read in `layout.tsx` for flash-free SSR. Settings page syncs cookie→DB on load. Slider applies instantly via `document.documentElement.style.setProperty`. `prose-sm` also overridden in `globals.css`.

`createUserScheduler()` in `scheduler.ts` creates FSRS instances with custom retention/interval. Used in `scheduleFlashcardReview` and `getIntervalPreviews`. Settings UI at `/settings` via `components/settings/fsrs-settings.tsx`.

## FSRS-6 + Per-User Parameter Optimization

ts-fsrs@5.2.3 defaults to **FSRS-6** (21 parameters, trainable decay `w[20]`). Per-user optimization via `@open-spaced-repetition/binding` (Rust napi-rs bindings) trains custom weights from `review_logs` using MLE + BPTT.

**Flow**: `review_logs` → group by flashcard_id → `FSRSItem[]` → `computeParameters()` → 21 weights → `profiles.fsrs_weights` (JSONB)

- `lib/fsrs/optimizer.ts` — transforms review logs, calls `computeParameters`, returns weights
- `profiles.fsrs_weights` — JSONB array of 21 numbers (NULL = use defaults)
- `profiles.fsrs_weights_updated_at` — last optimization timestamp
- `createUserScheduler()` passes `w: fsrs_weights` when non-null
- Auto-optimization: fires via `after()` when user has 50+ reviews and hasn't optimized recently
- Manual: "Optimize Now" button in `/settings` study settings card
- Minimum 50 reviews required for meaningful optimization
- Runs on Vercel serverless (NOT edge runtime) — native Rust binary via napi-rs

## Undo/Reset: Snapshot-Based Restore

`review_logs` stores full card-state-before snapshot (8 columns: `state_before`, `reps_before`, `lapses_before`, `elapsed_days_before`, `scheduled_days_before`, `last_review_before`, `due_before`, `learning_steps_before`). Undo = delete log + restore snapshot to `user_card_state`. No FSRS replay needed.

When `state_before IS NULL` → card was new before that review → delete card state entirely on undo. Old logs without snapshot columns fall back to same behavior.

## learning_steps Persistence

`user_card_state.learning_steps` column tracks FSRS learning step counter. Without this, cards in learning/relearning reset to step 0 on page reload. Mapped in `card-mapper.ts` `toCard()`/`fromCard()`.

## Testing

Vitest configured with jsdom + @testing-library. Run: `npm run test`

| Test File | Tests | Covers |
|-----------|-------|--------|
| `lib/fsrs/__tests__/flashcard-ordering.test.ts` | 16 | 4-bucket sort, sub-mode filters, counts, newCardsPerDay |
| `lib/fsrs/__tests__/question-ordering.test.ts` | 6 | Quiz question fetch, shuffle, category mapping |
| `lib/fsrs/__tests__/card-mapper.test.ts` | 30 | toCard/fromCard roundtrips, state mapping, learning_steps |
| `lib/fsrs/scheduler.test.ts` | 8 | FSRS scheduling integration, learning_steps progression |
| `lib/fsrs/__tests__/scheduler-factory.test.ts` | 5 | createUserScheduler, retention/interval effects |
| `lib/fsrs/__tests__/user-settings.test.ts` | 5 | getFsrsSettings, updateFsrsSettings |
| `lib/fsrs/__tests__/interval-preview-settings.test.ts` | 3 | Interval previews with user settings |
| `lib/fsrs/__tests__/retrievability.test.ts` | 4 | getRetrievability for various card states |
| `lib/fsrs/__tests__/daily-stats.test.ts` | 5 | getDailyStats (reviews, new cards, correct rate) |
| `lib/services/__tests__/admin-reviews.test.ts` | 16 | CRUD, status updates, error handling |
| `lib/services/__tests__/user-preferences.test.ts` | 18 | Suspend flashcards, hide topics, reading progress, profiles |
| `components/quiz/quiz-logic.test.ts` | 18 | Shuffle, grading, results, retry |
| `components/flashcards/flashcard-logic.test.ts` | 17 | 4-point grading, stack advance, categories |
| `lib/markdown/__tests__/preprocess-tooltips.test.ts` | 12 | Tooltip syntax conversion, escaping, code block skipping |
| `lib/fsrs/__tests__/fsrs6-verification.test.ts` | 1 | FSRS-6 default params verification |

**Total: 231+ tests across 21+ test files.**

## UX Patterns

- Fisher-Yates shuffle for quiz options
- "I don't know" button in quiz
- 4-point FSRS rating buttons with interval previews in flashcards
- Immediate feedback with explanations
- Per-card difficulty tracking
- Quiz attempt history with retry failed

## Patterns & Pitfalls

**Server actions in client `useEffect`**: Always wrap in try/catch. `requireAdmin()` throws on auth failure — unhandled throws in `startTransition` cause silent redirects. The admin layout handles access control; client-side fetches just need to swallow auth errors gracefully.

**Settings list components (hidden topics, suspended flashcards)**: Parent passes server-fetched data as initial prop + `onCountChange` callback. Child manages local state with `useState(initial)` and calls `onCountChange` on mutations so the parent's count/visibility stays in sync.

**Supabase Storage from Next.js API routes**: `~/.bashrc` exports `SUPABASE_SERVICE_ROLE_KEY` for the Launcher project; `process.env` takes priority over `.env.local`, so the Learn dev server was sending the wrong project's JWT. Fix: use `LEARN_SERVICE_ROLE_KEY` env var (falls back to `SUPABASE_SERVICE_ROLE_KEY` on Vercel where there's no bashrc collision). Upload uses raw `fetch` + `after()` from `next/server` for fire-and-forget (prevents context GC before completion).

**RLS visibility for content tables**: `topics`, `categories`, `flashcards`, `questions` all enforce topic visibility. When adding new content tables that reference topics/categories, the SELECT policy must check `topics.visibility IS DISTINCT FROM 'private' OR topics.creator_id = auth.uid() OR is_admin(auth.uid())`. A bare `true` policy leaks private content.

**Profiles are readable by all authenticated users**: The `profiles` SELECT policy allows any logged-in user to read any profile (for creator display names on topic cards). Don't add sensitive data to `profiles` without tightening this.

**MarkdownContent inside `<p>` tags**: `MarkdownContent` renders `<span className="block">` instead of `<p>` to avoid React hydration errors from nested `<p>` elements. If you render markdown in a context that's already inside a `<p>`, this is handled automatically.

## Troubleshooting

- `admin_users` table must contain your email for admin access
- All env vars must be set in both `.env.local` and Vercel dashboard
- See `CLAUDE-supabase.md` for migration troubleshooting
- `proxy.ts` is the correct Next.js 16 convention (replaces `middleware.ts`)
