# LEARN

A bilingual (EN/ES) quiz and flashcard application with FSRS spaced repetition for optimal learning.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth (email/password + anonymous)
- **Deployment**: Vercel
- **Spaced Repetition**: FSRS (Free Spaced Repetition Scheduler)

## Features

- 🌐 **Bilingual**: Full English/Spanish support
- 🎯 **Quiz Mode**: Multiple choice, true/false, with immediate feedback
- 🃏 **Flashcard Mode**: 3D flip animation, self-grading
- 🧠 **FSRS Scheduling**: Optimized review timing based on forgetting curves
- 📊 **Progress Tracking**: Per-question statistics and difficulty adjustment
- 🎨 **Themes**: Organized content by topic (e.g., Vaccines, Grammar)
- 👥 **Profiles**: Independent progress for multiple users
- 🔒 **RLS Security**: Row-level security for all user data
- 📱 **Responsive**: Works on mobile, tablet, and desktop

## Project Structure

```
learn-app/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── protected/         # Protected routes example
│   └── test-db/           # Database connection test
├── lib/
│   └── supabase/          # Supabase client utilities
├── supabase/
│   └── migrations/        # Database migrations
├── .env.local             # Local environment variables (not in git)
└── .env.example           # Environment template
```

## Database Schema

### Content Tables (15 total)
1. **themes** - Top-level content groupings
2. **categories** - Subject subdivisions
3. **questions** - Quiz/flashcard items
4. **profiles** - User profiles
5. **admin_users** - Admin permissions
6. **user_card_state** - FSRS scheduling data
7. **review_logs** - Review history
8. **suspended_questions** - Hidden questions
9. **hidden_themes** - Hidden themes
10. **reading_progress** - Reading mode tracking
11. **feedback** - User feedback
12. **question_reports** - Content quality reports
13. **proposed_questions** - Community contributions
14. **theme_proposals** - New theme suggestions

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
```

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

The database schema is managed automatically. All migrations in `supabase/migrations/` are applied automatically to the Supabase project.

**Note**: Claude Code manages all database migrations. You don't need to manually run SQL - migrations are applied automatically as needed.

### 5. Run Development Server

```bash
npm run dev
```

Visit:
- **Homepage**: http://localhost:3000
- **Database Test**: http://localhost:3000/test-db

The test page should show:
- ✓ Connected to Supabase successfully!
- Found 0 themes (until you seed data)
- Found 1 admin users

### 6. Build for Production

```bash
npm run build
npm run start
```

## Deployment

### Vercel Deployment

The app is deployed to Vercel at:
- **Production**: https://learn-app-theta-ten.vercel.app
- **Test Database**: https://learn-app-theta-ten.vercel.app/test-db

Environment variables are already configured in Vercel. Any code pushed to the `main` branch automatically deploys to production.

## Next Steps for Development

The infrastructure is complete. Here are the recommended next tasks:

### Phase 1: Core Features
1. **Auth UI**: Implement email/password + anonymous sign-in
2. **FSRS Integration**: Install `ts-fsrs` and implement scheduler
3. **Quiz Mode**: Auto-advancing question stack with FSRS scheduling
4. **Flashcard Mode**: 3D flip animation + self-grading
5. **Theme Selection**: Browse and select learning themes

### Phase 2: Content
6. **Port Questions**: Migrate 53 vaccine questions from `learn.html`
7. **Seed Data**: Create initial themes, categories, questions
8. **Reading Mode**: Educational content with progress tracking

### Phase 3: Admin & Polish
9. **Admin Panel**: Content management interface
10. **Analytics**: Google Analytics integration
11. **i18n System**: `next-intl` for proper language switching
12. **Feedback UI**: User feedback and question reporting

### Parallelization
These can be built independently by different agents:
- Auth UI (depends on: database ✓)
- FSRS integration (depends on: database ✓)
- Quiz UI (depends on: FSRS)
- Flashcard UI (depends on: FSRS)
- Admin panel (depends on: Auth)

## Testing

### Test Database Connection

Visit `/test-db` in both local and production to verify:
1. Environment variables are set
2. Database connection works
3. All tables exist
4. Admin user is configured

### Test Authentication

Visit `/auth/login` to test authentication flow (when implemented).

## Troubleshooting

### Build Errors

If you get prerendering errors:
- Check that async components use `export const dynamic = "force-dynamic"`
- Verify environment variables are set in Vercel

### Database Connection Fails

1. Check `.env.local` has correct Supabase credentials
2. Verify migration was applied (check table list in Supabase dashboard)
3. Check RLS policies allow access (admin_users table must have your email)

### Vercel Deployment Issues

1. Ensure all environment variables are set in Vercel dashboard
2. Redeploy after adding environment variables
3. Check build logs in Vercel dashboard

## Contributing

This is a personal project. If you want to contribute:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

Private project - all rights reserved.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Supabase logs for database errors
- Check Vercel logs for deployment errors

---

**Project Status**: Infrastructure complete ✓ | Ready for feature development

**Prototype Reference**: `../learn.html` - Original single-file prototype with 53 vaccine questions
