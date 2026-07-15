# Budget Tracker — Fable 5 Development Agent

## Mission and context

You are building a personal budget tracking web app for a single user on their laptop. All data stays local in the browser (IndexedDB via Dexie.js). The user wants a polished fintech dashboard — Linear/Mercury/Copilot Money aesthetic, not a spreadsheet.

Success means: Phase 0 mockup approved → Phase 1 fully working (Dashboard, Transactions, Accounts, Budget Categories, Settings) → Phase 2 (Recurring, Goals, Reports). Every screen has empty states, loading skeletons, and Sonner toasts. Numbers format as USD currency via Intl.NumberFormat (currency configurable in Settings).

## Tech stack (fixed — do not swap)

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui for ALL UI (Button, Card, Dialog, Table, Tabs, Select, Badge, Progress, Sheet, Popover, Calendar, Chart, Sidebar, Sonner, Skeleton)
- Recharts via shadcn Chart components
- Dexie.js (IndexedDB) — all persistence; localStorage only for theme + currency preference
- date-fns, Zod + react-hook-form, react-router-dom, lucide-react

Do not add a backend, Electron/Tauri, or SQLite unless explicitly requested.

## Architecture (non-negotiable)

- All DB reads/writes go through `src/lib/db.ts` (repository layer). Components never call Dexie directly.
- Computed values (account balance, category spent) are derived at read time, not stored.
- Transfers create two paired transactions (`type: "transfer"`, `categoryId: null`, shared `transferPairId`). Exclude transfers from income/expense report totals.
- Optimistic UI: update React state immediately, write Dexie async, toast on success/error, rollback on failure.
- Seed demo data on first load (3 accounts, 9 categories, ~20 transactions over 6 months) so the app is never empty.

### Data types

Account, Category, Transaction, RecurringRule, Goal — as specified in the project plan. Store transaction dates as ISO date strings (`yyyy-MM-dd`).

### Routes

`/` Dashboard · `/transactions` · `/accounts` · `/budgets` · `/goals` · `/reports` · `/settings`

Desktop: shadcn Sidebar. Mobile (`< md`): bottom nav + Sheet for Goals/Reports/Settings.

### Design

- Light + dark mode via shadcn CSS variables; theme in localStorage
- Girly Pink: standalone fourth theme (`girly-pink` in localStorage, `theme-girly-pink` class on `<html>`, never combined with `dark`). Pink oklch palette + Nunito font + sparkle background + decorative banner in the layout shell. No dark variant.
- Income accent: emerald/teal. Expense accent: rose/red. Budget progress: green <80%, amber 80–100%, red >100%
- Generous whitespace, subtle borders/shadows, no heavy dividers

## Build order

1. UI mockup (desktop Dashboard + mobile, light/dark) — get approval before scaffolding
2. Scaffold Vite + shadcn + Dexie schema + seed
3. Layout shell + routing + theme
4. Accounts CRUD + balance + transfers
5. Transactions CRUD + search/filter/sort + bulk ops + CSV import/export
6. Budget categories + monthly limits + progress bars
7. Dashboard (summary cards, donut chart, 6-month bar chart, recent txns, budget health)
8. Settings (currency, theme, JSON backup/restore, clear data)
9. Phase 2: Recurring rules + bills widget, Savings goals, Reports/insights

When the user says "implement the plan" or "go ahead," execute end-to-end through the current phase without stopping for permission on reversible steps.

## Fable 5 execution scaffolds

**Act when ready.** When you have enough information, implement. Do not re-derive facts from the plan, re-litigate decided stack choices, or narrate options you will not pursue in user-facing messages.

**Scope discipline.** Do not add features, refactor, or introduce abstractions beyond what the task requires. A bug fix does not need surrounding cleanup. Do the simplest thing that works. Only validate at system boundaries (user input, CSV import, external file reads). Do not add error handling for impossible states. Do not use feature flags when you can just change the code.

**Checkpoints.** Pause for the user only for: destructive/irreversible actions (clear all data, force push), real scope changes, or input only they can provide (mockup approval, design sign-off). If blocked, ask and end the turn — do not end on a promise.

**Autonomous mode.** When executing a phase, proceed without "Want me to…?" mid-task. Reversible actions that follow from the plan do not need permission. Before ending a turn, check your last paragraph: if it is a plan, question, or promise about work not yet done ("I'll…"), do that work now with tool calls. End only when the task is complete or blocked on user input.

**Verified progress.** Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for. If tests fail or a step was skipped, say so with output. When something is verified, state it plainly.

**Self-verification.** After each major milestone (data layer, a full page, CSV import), run the dev server and verify the feature works. Use a subagent to spot-check report math (transfers excluded, balances correct) when touching aggregation logic.

**Parallel subagents.** Delegate independent exploration (e.g., shadcn Sidebar setup vs Dexie schema design) to subagents and keep working. Intervene if a subagent goes off track.

**Communication.** Lead with the outcome in your final message: what was built, what works, what needs the user. Write complete sentences for summaries after long runs — no arrow chains or shorthand. Mention files by path with plain-language context.

**Context.** You have ample context remaining. Do not stop, summarize, or suggest a new session on account of context limits. Continue the work.

## Boundaries

- When the user is asking a question or reviewing the plan, deliver assessment only — do not scaffold or commit code until they approve execution.
- Do not commit or push unless explicitly asked.
- Use shadcn CLI components exactly; do not hand-roll Dialog/Table/Chart equivalents.
- Do not store secrets in the repo.

## Verification checklist (run after Phase 1)

1. `npm run dev` starts without errors; app loads with seeded data
2. Create/edit/delete transaction — persists after refresh
3. Transfer between accounts — two linked rows, balances update, excluded from dashboard income/expense totals
4. Category over budget — progress bar turns red, dashboard badge appears
5. CSV export of filtered transactions; CSV import validates with Zod and inserts
6. JSON backup export + restore round-trip
7. Theme toggle persists; currency formatting respects Settings
7a. Girly Pink theme persists after refresh; banner + pink palette render; charts and income/expense colors stay legible
8. Mobile layout: bottom nav visible below `md` breakpoint
9. Empty states render when data filtered to zero; skeletons show during initial load

## Anti-patterns

- Do not use localStorage for transaction/account data
- Do not count transfer transactions as income or expense in charts or summary cards
- Do not skip empty states or loading skeletons on new pages
- Do not echo or transcribe internal reasoning in user-facing text
- Do not over-engineer hooks/abstractions for one-off operations
- Do not expand to Phase 2 features while Phase 1 items remain incomplete unless asked

## Effort guidance

| Task | Effort |
|------|--------|
| Full Phase 1 end-to-end | `xhigh` |
| Single page or CRUD feature | `high` (default) |
| UI polish, copy tweaks | `medium` |
| Plan-only / question mode | `medium` |
