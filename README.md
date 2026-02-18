# LEARN

A bilingual (EN/ES) quiz and flashcard application with FSRS spaced repetition for optimal learning.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth (email/password + anonymous)
- **Deployment**: Vercel
- **Spaced Repetition**: FSRS-6 via [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (TypeScript scheduling engine) + [`@open-spaced-repetition/binding`](https://github.com/open-spaced-repetition/fsrs-rs-nodejs) (Rust napi-rs optimizer for per-user parameter training). Both by Jarrett Ye / open-spaced-repetition
- **i18n**: next-intl (English/Spanish)

## Features

- **Bilingual**: Full English/Spanish support with language switcher
- **Flashcard Mode**: 4-point FSRS rating (Again/Hard/Good/Easy), interval previews, keyboard hotkeys
- **Quiz Mode**: Multiple choice recognition test with score tracking and retry
- **Reading Mode**: Markdown-based educational content with progress tracking
- **FSRS-6 Scheduling**: Latest 21-parameter algorithm with automatic per-user optimization — trains on your review history for personalized scheduling
- **Progress Tracking**: Recall mastery via flashcards, recognition scores via quizzes
- **Topics**: Organized content by topic with category breakdowns
- **Admin Panel**: Separate management for flashcards and quiz questions, topic CRUD, content moderation
- **MCP Server**: 41 tools for programmatic content management
- **Profiles**: Independent progress for multiple users
- **RLS Security**: Row-level security for all user data
- **SEO**: Dynamic OG images, structured data, sitemap, canonical URLs
- **Anki Import**: Upload `.apkg` decks with automatic media extraction, template rendering, and duplicate detection
- **Text-to-Speech**: Click/tap any paragraph to hear it read aloud via ElevenLabs (reading mode, flashcard answers, quiz explanations)
- **Responsive**: Works on mobile, tablet, and desktop

## Architecture

**Flashcards** are the primary study mode — recall-based, using FSRS 4-point rating. Content stored in `flashcards` table. Progress tracked via `user_card_state` and `review_logs`.

**Quizzes** are optional recognition tests — multiple choice, no FSRS. Content stored in `questions` table. Results stored in `quiz_attempts` table.

Progress shown throughout the app reflects **flashcard recall mastery** only.

**FSRS-6 Optimization** uses `@open-spaced-repetition/binding` (Rust napi-rs) to train 21 personalized parameters per user from their `review_logs`. Optimized weights stored in `profiles.fsrs_weights` (JSONB). Auto-triggers after 50+ reviews or manual via Settings.

## Project Structure

```
learn-app/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── topics/            # Topic browse, detail, quiz, flashcard, reading
│   ├── admin/             # Admin panel (topics, flashcards, quizzes, reviews)
│   ├── settings/          # User preferences
│   └── about/             # About page
├── components/            # React components
│   ├── topics/            # TopicCard, TopicGrid
│   ├── flashcards/        # FlashcardSession, FlashcardStack, FlashcardResults
│   ├── quiz/              # QuizSession, QuizCard, QuizResults
│   ├── admin/             # TopicForm, FlashcardEditForm, QuestionEditForm
│   ├── reading/           # ReadingProgress
│   ├── settings/          # HiddenTopicsList, SuspendedFlashcardsList
│   ├── feedback/          # FeedbackModal, QuestionReportForm
│   ├── session/           # SessionToolbar (edit/delete during study)
│   └── seo/               # StructuredData components
├── lib/
│   ├── supabase/          # Supabase client utilities
│   ├── services/          # Server actions (admin-topics, quiz-attempts, user-preferences)
│   ├── fsrs/              # FSRS spaced repetition (ordering, actions, progress, interval-preview)
│   ├── seo/               # Metadata helpers, structured data generators
│   └── types/             # TypeScript interfaces
├── messages/              # i18n translations (en.json, es.json)
├── mcp-server/            # MCP content management server (41 tools)
├── supabase/
│   └── migrations/        # Database migrations
└── .env.local             # Local environment variables (not in git)
```

## Database Schema (17 tables)

**Content** (public read, admin write):
- `topics` — Top-level content groupings
- `categories` — Subject subdivisions within topics
- `questions` — Quiz items (multiple choice, true/false)
- `flashcards` — Recall cards (question/answer pairs for FSRS)

**User Management**:
- `profiles` — User profiles with display names
- `admin_users` — Admin permissions

**FSRS Spaced Repetition**:
- `user_card_state` — FSRS scheduling data (FK → flashcards)
- `review_logs` — Review history (FK → flashcards)

Profiles also store `fsrs_weights` (JSONB) for per-user optimized FSRS-6 parameters.

**Quiz**:
- `quiz_attempts` — Quiz results (user_id, topic_id, score, total, answers JSONB)

**User Preferences**:
- `suspended_flashcards` — User-hidden flashcards
- `hidden_topics` — User-hidden topics
- `reading_progress` — Reading mode tracking

**Feedback & Moderation**:
- `feedback` — User feedback (has `question_id` + `flashcard_id` FKs)
- `question_reports` — Content issue reports with admin review workflow
- `proposed_questions` — Community-proposed questions/flashcards (has `target_type`)
- `topic_proposals` — Community topic suggestions

All tables have RLS policies for secure data access.

## Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)
- Git

### 1. Clone the Repository

```bash
git clone git@github.com-la:Laurentiu-Andronache/learn.git
cd learn/learn-app
```

### 2. Install Dependencies

```bash
npm install
git config core.hooksPath .githooks
```

The second command enables the pre-commit hook that runs lint (check-only), tests, and build before each commit.

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_ADMIN_EMAIL=your-email@example.com
```

Get these values from:
- Supabase Dashboard → Settings → API

### 4. Database Migration

The database schema is managed via migration files in `supabase/migrations/`. All migrations are applied automatically to the linked Supabase project.

### 5. Run Development Server

```bash
npm run dev
```

Visit:
- **Homepage**: http://localhost:4000

### 6. Build for Production

```bash
npm run build
npm run start
```

## Linting & Formatting

[Biome](https://biomejs.dev/) handles both linting and formatting:

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run validate      # lint:fix + test + build (same as pre-commit hook)
```

## Testing

Vitest configured with jsdom + @testing-library/react. Run:

```bash
npm run test
```

334 tests across 24 test files covering FSRS ordering, card mapping, scheduling, admin CRUD, user preferences, quiz logic, flashcard grading, glossary tooltip processing, Anki import cleanup, and optimizer integration. The MCP server has an additional 175 tests across 9 test files.

## Deployment

### Vercel Deployment

The app is deployed to Vercel at:
- **Production**: https://learn.gift

Environment variables are configured in Vercel. Code pushed to `main` auto-deploys.

## MCP Server

The `mcp-server/` directory contains a Model Context Protocol server with 41 tools for programmatic content management: CRUD for topics, categories, questions, flashcards; import/export; translation management; analytics; and admin operations.

## Contributing

This is a personal project. If you want to contribute:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

Private project - all rights reserved.

---

**Project Status**: Core features complete | Flashcard (FSRS 4-point), Quiz (recognition test), Reading modes live
