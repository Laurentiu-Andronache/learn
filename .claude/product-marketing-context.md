# LEARN — Product Marketing Context

> Reference deck for the copywriting skill. Read this before generating any marketing copy for learn.gift.

---

## 1. Product Overview

**LEARN** (https://learn.gift) is a free, bilingual (EN/ES) spaced repetition platform focused on healthspan extension and cognitive improvement. It uses **FSRS-6** — the latest version of the Free Spaced Repetition Scheduler, a modern replacement for Anki's SM-2. FSRS-6 uses 21 trainable parameters to schedule reviews at scientifically optimal intervals, and automatically optimizes these parameters for each user based on their personal review history.

Three study modes: **Reading** (comprehension foundation with click-to-read TTS), **Flashcards** (FSRS 4-point rating: Again/Hard/Good/Easy), and **Quizzes** (multiple-choice recognition tests with explanations).

Available as a PWA — installable on any device, no app store required.

---

## 2. The Mission

Help people live longer, healthier, more cognitively sharp lives — and **apply what they learn to their own lives**. Not passive reading. Active retention of health knowledge that changes behavior.

---

## 3. Pricing

- Completely free
- No premium tier, no paywalls, no ads
- Guest access — no signup required to start learning
- No data selling, no upsells

---

## 4. Target Audience

### Primary Segments

| Segment | Description |
|---------|-------------|
| Health-conscious adults (25–65) | People who read health articles but forget the details within weeks |
| Spanish speakers | Underserved by English-only health education tools |
| Longevity community | Biohackers, health optimizers, people following longevity research |
| Self-directed learners | People who want structured learning without a course |

### Pain Points

- "I read an article about vaccines/supplements/longevity and forgot everything within a month"
- "I know I should stay up-to-date on health research but I can't retain it all"
- "Health content exists, but nothing helps me actually remember and apply it"
- "Anki is powerful but overwhelming — I don't want to make my own flashcards about health topics"
- "Most health apps track metrics but don't teach me anything"

---

## 5. Core Value Proposition

**Read once, remember forever.** Dedicate ~10 minutes a day to scientifically-scheduled review sessions and retain health knowledge permanently. Then apply it.

The transformation: from "I read about that once" → "I know this well enough to act on it."

---

## 6. Key Messages (Ranked by Importance)

1. **Daily commitment is essential** — This is NOT read-and-forget content. ~10 minutes/day for real retention. The daily habit IS the product. Frame this as what makes real learning work, not a burden.
2. **Free, no catches** — Completely free, no premium tier, no ads, guest access. Prominent but not the only message.
3. **Science-backed spaced repetition (FSRS)** — The same algorithm principles used in medical school flashcard systems, modernized. Reviews scheduled at the exact moment you're about to forget.
4. **Healthspan & cognitive improvement focus** — Curated content on topics that help you live longer and think better.
5. **Apply what you learn** — The goal isn't trivia. Every flashcard passes the test: "Would knowing this change someone's health behavior?"
6. **Bilingual (EN/ES)** — Full bilingual support, not machine-translated afterthoughts. Every question, answer, and explanation exists in both languages.

---

## 7. Differentiators

### vs. Anki / Generic Flashcard Apps
- **Latest algorithm (FSRS-6)**: 21 trainable parameters with automatic per-user optimization. Anki's default SM-2 is decades old; even Anki's optional FSRS mode requires manual optimizer runs
- **Curated content**: Expert-created health modules — no need to make your own cards
- **Accessible UX**: Clean modern interface, not a 2006-era desktop app
- **Free without complexity**: No add-on ecosystem to navigate
- **Personalized optimization**: LEARN automatically trains scheduling parameters on your review history. Anki requires manually running a separate optimizer tool — most users never do this

### vs. Health & Wellness Apps
- **Actual learning, not just tracking**: Most health apps track steps/calories/sleep — LEARN teaches you the science behind health decisions
- **Long-term retention**: Articles and videos are consumed once; LEARN ensures you remember months later
- **Actionable knowledge**: Content designed to change behavior, not just inform

### vs. Reading Articles / Watching Videos
- **Retention**: Reading an article = ~10% retained after a month. Spaced repetition = ~90%+ with regular review
- **Active recall**: Flashcards force retrieval, the strongest memory-forming mechanism known
- **Structured progression**: From reading comprehension → active recall → recognition testing

### vs. Online Courses
- **10 minutes/day, not 10 hours/week**: Micro-learning sessions that fit into any schedule
- **Ongoing retention**: Courses end and you forget. LEARN keeps knowledge alive indefinitely
- **Free**: No course fees, no subscriptions

---

## 8. Features → Benefits

| Feature | Benefit |
|---------|---------|
| FSRS spaced repetition algorithm | Reviews exactly when you're about to forget — maximum retention, minimum effort |
| FSRS-6 algorithm (21 parameters) | Latest spaced repetition science — trainable forgetting curves adapt to how your memory actually works |
| Automatic parameter optimization | The app learns YOUR memory patterns — scheduling becomes more efficient the more you study |
| 4-point rating (Again/Hard/Good/Easy) | You control your learning pace — cards adapt to your actual knowledge |
| Three study modes (Reading/Flashcards/Quiz) | Learn your way — read to understand, recall to retain, quiz to test yourself |
| Per-user retention settings (0.70–0.97) | Customize how aggressively the system schedules reviews for your goals |
| New cards/day limit + ramp-up | Never feel overwhelmed — start easy and build up naturally |
| Visual progress tracking | See exactly how many cards you've mastered vs. still learning |
| Due today badges | Know at a glance what needs review — no guessing |
| Guest access (no signup) | Start learning immediately, decide later if you want to save progress |
| Bilingual EN/ES | Learn in your preferred language, or practice health vocabulary in both |
| Text-to-speech (ElevenLabs) | Tap any paragraph to hear it read aloud — great for pronunciation and comprehension |
| Adjustable font size | Comfortable reading on any device |
| Dark/light/system themes | Study in any environment |
| PWA installable | Add to home screen — feels like a native app, works offline |
| Glossary tooltips | Technical terms explained inline — hover or tap for definitions |
| Keyboard shortcuts (1/2/3/Space/4) | Power users can fly through reviews |
| Interval previews on rating buttons | See when each card will come back before you rate it |
| Undo last review | Made a mistake? One tap to reverse |
| Snapshot-based progress restore | Your learning history is fully recoverable |

---

## 9. Proof Points

### Algorithm
- FSRS (Free Spaced Repetition Scheduler) developed by open-source community, peer-reviewed benchmarks show it outperforms SM-2: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
- Used by Anki (via add-on) and other major flashcard platforms
- FSRS-6 is the latest version (21 parameters, up from 19 in FSRS-5), adding trainable forgetting curve decay and improved same-day review handling
- Per-user optimization trains weights on individual review history using Maximum Likelihood Estimation + Backpropagation Through Time (via Rust `fsrs-rs` engine)
- Default parameters derived from hundreds of millions of reviews across ~10k users; personalized optimization further refines for individual memory patterns

### Content Methodology
- Created using a collaboration between human expert prompts, Claude Opus 4.6, Gemini Deep Research, and scientific studies in PDF
- Cross-verified across multiple AI models to minimize hallucinations
- Every item passes the actionability test: "Would knowing this change someone's health behavior?"
- 100% bilingual — not machine-translated but natively authored in both languages

### Current Content (Vaccines & Longevity Module)
- 44 flashcards across 10 categories, 41 quiz questions
- Covers: shingles-dementia risk reduction (evidence that shingles vaccination reduces dementia risk), pneumonia prevention, RSV protection for older adults, catch-up schedules, immune senescence
- Specific stat example: Studies show shingles vaccination associated with reduced dementia risk — a finding most people have never heard of

### Technical Quality
- 230 automated tests across 20 test files
- Full RLS (Row Level Security) on all database tables
- No data collection beyond what's needed for learning progress

---

## 10. Objections & Responses

| Objection | Response |
|-----------|----------|
| "I don't have 10 minutes a day" | You spend more time scrolling health articles you'll forget. 10 minutes of spaced repetition replaces hours of re-reading. |
| "I'll just read articles" | Reading = ~10% retention after a month. Spaced repetition with active recall = 90%+. The question isn't whether you read it — it's whether you'll remember it when it matters. |
| "Why is it free? What's the catch?" | Built by a developer who believes health education should be accessible. No ads, no data selling, no premium tier coming. The code is the product, not the users. |
| "There's only one topic" | Starting with one thoroughly-researched module is intentional — quality over quantity. More topics are actively in development. Each one goes through multi-model AI verification against scientific literature. |
| "I already use Anki" | LEARN uses **FSRS-6** (which outperforms Anki's default SM-2) and **automatically optimizes scheduling parameters** for your personal memory patterns — something most Anki users never set up. Plus curated health content and a modern UI. If you love Anki, LEARN complements it for health topics. |
| "Is AI-generated content reliable?" | Content is created through a multi-step process: human expert prompting → AI generation (Opus 4.6 + Gemini Deep Research) → cross-verification against scientific PDFs → human review. It's more rigorous than most health articles online. |
| "I'm not sick, why do I need this?" | Prevention is the entire point. Knowing which vaccines reduce dementia risk, how immune senescence works, or when to get boosters — these decisions are made years before illness, not after. |
| "I don't speak Spanish" | Use it in English. The bilingual feature exists for the large Spanish-speaking community that lacks quality health education tools in their language. |

---

## 11. Brand Voice

### Personality
- **Confident and grounded** — We know spaced repetition works. State it plainly.
- **Accessible** — Write for a smart friend, not a medical journal or a marketing funnel
- **Direct** — Get to the point. No filler paragraphs.
- **Evidence-first** — Claims backed by research or specific content examples
- **Quietly ambitious** — The mission is big (help people live longer) but the tone is understated

### Do
- Use plain language: "remember" not "optimize retention outcomes"
- Reference specific content: "learn why shingles vaccination may reduce dementia risk" not "explore health topics"
- Acknowledge current limitations honestly: "starting with one deeply-researched topic"
- Frame the daily commitment as empowering, not demanding
- Let the product speak — mention features that are real and available now

### Don't
- Use buzzwords: "revolutionary," "cutting-edge," "game-changing," "unlock your potential"
- Fabricate statistics or testimonials
- Promise health outcomes: we teach knowledge, not prescribe treatment
- Use exclamation points (one exception: the existing homepage headline is grandfathered)
- Hype features that don't exist yet as if they're available
- Over-explain spaced repetition — most people don't care about the algorithm, they care about the result

### Tone Spectrum

| Context | Tone |
|---------|------|
| Headlines | Bold, specific, benefit-driven |
| Body copy | Clear, conversational, grounded |
| Feature descriptions | Factual, concise |
| Objection handling | Empathetic, then factual |
| CTAs | Action-oriented, specific about what they get |

---

## 12. Current State & Roadmap

### Available Now
- Full learning platform at https://learn.gift
- 1 topic: Vaccines & Longevity (44 flashcards, 41 quiz questions, 10 categories)
- 3 study modes: Reading, Flashcards (FSRS), Quizzes
- Bilingual EN/ES with language switcher
- Text-to-speech on all text content
- Guest access (no signup required)
- PWA installable
- Customizable study settings (retention, new cards/day, font size, themes)
- Progress tracking with visual indicators
- FSRS-6 with automatic per-user parameter optimization (trains on your review history for personalized scheduling)

### Coming Soon
- More health & longevity topics (nutrition, sleep, exercise science, supplements)
- AI-powered personalized content generation — users request any health topic and AI generates cross-verified flashcards and quizzes
- Community topic proposals (infrastructure exists, content pipeline expanding)

### Marketing Implications
- Frame current state as "starting with" not "limited to"
- The AI content generation feature is COMING — do not describe it as available
- Each new topic goes through the same rigorous multi-model verification process

---

## 13. Founder's Pitch (Reference)

Original message used to introduce the app:

> I have developed an app focused on cognitive improvement and healthspan extension: https://learn.gift. I recommend dedicating 10 minutes a day to it (available in Spanish and English) and sending feedback via the app. Currently, it features a module on adult vaccines — created using a collaboration between my own prompts, Opus 4.6, Gemini 3 Pro Deep Research, and scientific studies in PDF. Of course, one of the goals should be to apply what you learn to your own life. Soon, I will add a feature allowing the AI to generate personalized content on any topic, utilizing advanced models with cross-verification to prevent hallucinations.

Use this as a reference for the founder's natural voice and priorities. Note the emphasis on: daily commitment, bilingual, AI methodology transparency, and applying knowledge.

---

## Quick Reference for Copy Tasks

| When writing... | Emphasize... |
|-----------------|-------------|
| Homepage | Daily habit + free + healthspan mission |
| Landing page (cold traffic) | Problem (forgetting health articles) → solution (spaced repetition) → free |
| Landing page (longevity community) | FSRS algorithm + curated health content + specific vaccine-dementia stat |
| Social media post | One specific insight from content + "remember this with daily 10-min sessions" |
| App Store / PWA listing | Free, bilingual, science-backed, health-focused learning |
| Email to health-conscious audience | Apply what you learn + daily commitment + specific example |
| Spanish-language copy | Native bilingual support (not translated) + same quality in both languages |
