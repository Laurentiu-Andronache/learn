# Content Creation Guide

Reference for agents creating flashcards, quiz questions, and reading material for the Learn app.

## Audience & Scope

Adults interested in healthspan extension, cognitive improvement, and applied science. Content should be **actionable** — readers should leave knowing what to do differently, not just trivia. Everything bilingual: EN + ES (native-quality, not Google Translate).

## Glossary Tooltips

Syntax: `{{term|explanation}}` — renders as hover/tap tooltips in the app.

- Supported in: reading material, flashcard answers/extras, quiz explanations/extras
- Only annotate **first occurrence** of each term per content block
- Both EN and ES versions need their own `{{term|explanation}}` with explanations in the respective language
- Keep explanations to 1-2 sentences, plain language
- Skip terms most adults already know
- If surrounding text already defines the term (e.g., "inflammaging — chronic low-grade inflammation..."), skip the tooltip
- Code blocks and inline code are left untouched by the preprocessor

## Flashcards (FSRS Recall)

Primary study mode. Users see the question, try to recall, then self-grade (Again/Hard/Good/Easy).

| Field | Guideline |
|-------|-----------|
| `question` | One clear question. Short enough to read in 2 seconds. Test one concept. |
| `answer` | Direct answer, 1-3 sentences max. No filler. |
| `extra` | Rich context: why it matters, mechanism, analogy. Markdown + tooltips OK. This is where depth lives. |
| `difficulty` | 1-3 basic facts, 4-6 applied knowledge, 7-8 mechanisms/nuance, 9-10 specialist detail |

**Good flashcard question patterns:**
- "What is the primary benefit of X for longevity?"
- "Why does X increase risk of Y?"
- "What mechanism links X to Y?"

**Bad patterns:**
- "Name the 4 types of..." (lists are bad for recall)
- "In what year was..." (trivia unless the date matters)
- "What is the molecular weight of..." (not actionable)

## Quiz Questions (Recognition Test)

Multiple choice or true/false. Tests recognition, not recall. Complementary to flashcards.

| Field | Guideline |
|-------|-----------|
| `question` | Clear, unambiguous. One correct answer. |
| `options` | 4 choices for MC. Distractors should be plausible, not absurd. |
| `correct_index` | 0-indexed. |
| `explanation` | Why the correct answer is right AND why top distractors are wrong. Markdown + tooltips OK. |
| `extra` | Deeper context, analogies, real-world implications. Expandable "Learn More" section. Markdown + tooltips OK. |
| `difficulty` | Same 1-10 scale as flashcards. |

**Distractor quality matters.** Bad distractors make questions trivial. Each wrong option should be something a learner might genuinely believe. Pull from common misconceptions.

The app adds a 5th "I don't know" option automatically — never include it in `options`.

## Reading Material

Long-form content for topic `intro_text_en`/`intro_text_es`. Displayed in reading mode with progress tracking.

- Use markdown: headers, bold, lists
- Structure with `**numbered sections**` for scanability
- Use `{{term|explanation}}` tooltips for technical terms (first occurrence only)
- Focus on **why it matters for healthspan**, not encyclopedia entries
- Analogies are powerful — use them to explain mechanisms
- Keep paragraphs short (3-4 sentences max)

## What NOT to Include

- Protein names, gene codes, or chemical formulas unless truly useful for decision-making
- Exact study statistics ("p=0.003") — summarize as "significantly reduced risk"
- Historical dates unless they provide context
- Filler phrases ("It's important to note that...")
- Content that can't pass the test: "Would knowing this change someone's health behavior?"

## Difficulty Calibration

| Level | Description | Example |
|-------|-------------|---------|
| 1-2 | Common knowledge | "Vaccines help prevent disease" |
| 3-4 | Basic health literacy | "Shingrix requires 2 doses" |
| 5-6 | Applied understanding | "Why shingles increases stroke risk" |
| 7-8 | Mechanism knowledge | "How AS01B adjuvant enhances immune response" |
| 9-10 | Specialist detail | "Glycoprotein E conformational epitopes" |

Most content should sit at **4-7**. Below 4 is too obvious. Above 7 should be rare and only when genuinely useful.

## Bilingual Quality

- ES translations must be natural, not literal. Adapt idioms and examples.
- Medical terms: use the standard Spanish medical term, not a literal translation
- If a brand name is the same in both languages (e.g., "Shingrix"), keep it
- Explanations may need cultural adaptation (e.g., healthcare system references)
