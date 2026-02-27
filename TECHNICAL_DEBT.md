# Technical Debt Register — Learn App

**Last updated:** 2026-02-27
**Files analyzed:** ~270 source files (`.ts`/`.tsx`, excluding `node_modules`, `.next`, tests)
**Total LOC:** ~21,800 (app source) + ~2,100 (MCP server)

## Health Summary

```
┌────────────────────────────────┬──────────┐
│ Metric                         │ Value    │
├────────────────────────────────┼──────────┤
│ Files >300 LOC                 │ 8        │
│ Files >200 LOC                 │ 20       │
│ Type casts (as unknown/any)    │ 10       │
│ @ts-expect-error               │ 0        │
│ TODO/FIXME/HACK markers        │ 0        │
│ Dead/commented-out code        │ 0        │
│ Dependency issues              │ 0        │
│ Test coverage (files)          │ 32 files │
│ Test count                     │ 393      │
│ Active debt items              │ 3        │
│ Resolved since last review     │ 14       │
└────────────────────────────────┴──────────┘
```

**Overall**: Well-maintained codebase with zero debt markers, zero dead code, clean dependencies, strong error handling. Remaining debt is component complexity (admin-only) and one large page file.

---

## CRITICAL (0)

No critical issues found. Security, auth, and RLS patterns are solid.

---

## HIGH (1 item)

### DEBT-002: `app/admin/quizzes/questions-client.tsx` — 342 LOC, 5+ useEffect chains

**Category:** Code Quality / Component Complexity
**Location:** `app/admin/quizzes/questions-client.tsx`

Admin quiz client has 5+ interdependent useEffect hooks with 6+ callback dependencies, mixed concerns (data fetching + filtering + editing + translation).

**Impact:** Complex effect chains make bugs hard to trace. High cognitive load. Admin-only, low user impact.

**Proposed fix:** Extract server data fetching into a custom hook. Split filtering/editing into sub-components.

**Effort:** 3-4 hours

---

## MEDIUM (1 item)

### DEBT-006: `app/topics/[id]/page.tsx` — 408 LOC

**Location:** `app/topics/[id]/page.tsx`

Largest page component. Handles topic resolution, redirect, progress fetching, quiz attempts, reading progress, daily stats, and renders 6+ sections. Most critical user-facing page — needs its own dedicated PR.

**Proposed fix:** Extract data-fetching into `getTopicPageData()` helper.

**Effort:** 2 hours

---

## LOW (1 item)

### DEBT-022: `use-import-state.ts` — cyclomatic complexity 19, 170 LOC hook

**Location:** `app/import/use-import-state.ts`

Complex import state machine with 19 cyclomatic complexity. Manageable since it's a single concern (import flow), but could benefit from a state machine pattern. Working correctly — moderate risk to refactor.

**Effort:** 2-3 hours (optional)

---

## Resolved Items

| ID | Item | Resolution |
|----|------|-----------|
| DEBT-001 | `actions.ts` 483 LOC | Decomposed: `snapshot.ts` + `auto-optimizer.ts`. Now 260 LOC. |
| DEBT-003 | 4x double-cast `as unknown as Record<string, unknown>` | Changed `localizedField` to accept `Record<string, any>`, removed all 4 casts |
| DEBT-004 | Missing try/catch on server actions | All 3 locations now have try/catch + toast.error() |
| DEBT-005 | `session-toolbar.tsx` 337 LOC | Extracted `help-dialog.tsx` + `edit-dialog.tsx`. Now 250 LOC. |
| DEBT-007 | flashcard-ordering 7-param functions | False positive: already uses options pattern |
| DEBT-008 | Inconsistent API error format | Both TTS + import routes now use `Response.json({ error }, { status })` |
| DEBT-009 | fsrs-settings 8 useState | False positive: only 4 useState (2 independent loading booleans — correct design) |
| DEBT-010 | topic-form 11+ useState | False positive: only 2 useState, rest is react-hook-form |
| DEBT-011 | anki-media 9-param functions | False positive: max 3 params in actual code |
| DEBT-012 | anki-translate positional params | Refactored `callAnthropicAPI` to options object pattern |
| DEBT-013 | flashcard-edit-form `Record<string, unknown>` | Added `FlashcardFormState` typed interface + `field()` helper |
| DEBT-014 | MCP monolithic analytics/translation | Split into handler files with barrel exports |
| DEBT-015 | language-switcher `.then().catch()` chain | Refactored to async/await IIFE |
| DEBT-016 | @ts-expect-error for lamejs | False positive: no @ts-expect-error present, types complete |
| DEBT-017 | MCP admin-briefing `as any` casts | Replaced 5x `as any` with typed `CountResult` cast |
| DEBT-018 | Silent `.catch(() => {})` in sessions | Added toast.error() with i18n keys for bury/undo/delete/grade/suspend |
| DEBT-019 | `startTransition` without try/catch | Added try/catch + toast.error() to reading-progress + profile-editor |
| DEBT-020 | Unvalidated `JSON.parse` in imports | Added structural guard in crowdanki-parser, try/catch in MCP import-export |
| DEBT-021 | `Record<string, unknown>` in flashcard-edit-form | Typed with `FlashcardFormState` interface (merged with DEBT-013) |

---

## Positive Findings

- Zero TODO/FIXME/HACK markers — debt is tracked here, not left in comments
- Zero dead/commented-out code — clean codebase
- Zero @ts-expect-error suppressions
- Zero dependency issues — all deps are current, no duplicates, no deprecated packages
- Consistent server action auth pattern (`requireUserId`, `requireAdmin`)
- Consistent error handling: all server action calls have try/catch + toast.error()
- Proper RLS enforcement across all data access
- Error boundaries at 4 levels (global, app, topic, admin)
- Loading skeletons for all major routes
- 393 tests across 32 files covering critical paths
- Clean server/client boundary separation
- No barrel export / circular dependency issues
- All console statements are intentional (audit logs, error reporting)
