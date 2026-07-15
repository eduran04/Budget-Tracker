# Budget Tracker

A personal budget tracking web app. Local-first: all data lives in your browser's IndexedDB — nothing leaves your laptop.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. The app seeds demo data (3 accounts, 10 categories, ~6 months of transactions) on first load so you can explore immediately. Use Settings → Clear all data to start fresh.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4 + shadcn/ui components
- Recharts (via shadcn Chart) for visualizations
- Dexie.js (IndexedDB) for persistence; localStorage for theme/currency preferences only
- date-fns, Zod + react-hook-form, react-router-dom

## Features

- **Dashboard** — balance/income/expense/net summary cards, spending donut, 6-month income vs expense trend, recent transactions, budget health, upcoming bills
- **Transactions** — search, filter (type/category/account/date range), sort, bulk delete and bulk category reassignment, CSV import/export, plus a Recurring tab
- **Accounts** — multiple accounts with computed balances, archive/restore, transfers between accounts (paired transactions, excluded from income/expense reports)
- **Budgets** — categories with icons/colors and monthly limits; green/amber/red progress with over-budget alerts
- **Recurring** — weekly/monthly/yearly rules, auto-generate on due date or manual "Mark paid"
- **Goals** — savings targets with progress, contributions (optionally as transfers), projected completion date
- **Reports** — month-over-month and year-over-year comparisons, top spending categories, plain-language insights
- **Settings** — currency, light/dark/system theme, JSON backup & restore, clear all data

## Project structure

```
src/
  lib/          db.ts (Dexie repository layer), seed.ts, csv.ts, compute.ts, schemas.ts
  hooks/        reactive data hooks (dexie-react-hooks), theme, currency
  components/   ui/ (shadcn), layout/, shared/, plus feature folders
  pages/        Dashboard, Transactions, Accounts, Budgets, Goals, Reports, Settings
  types/        data model types
```

All persistence goes through `src/lib/db.ts`, so the storage backend could be swapped without touching components.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |

## Testing

Tests live in `src/lib/*.test.ts` next to the modules they cover. Shared fixtures are in `src/test/fixtures.ts`.

**What's tested:**
- **Pure logic** — `compute.ts` (balances, totals, budget health), `csv.ts` (import/export), `schemas.ts` (Zod validation), `currency.ts`, `dates.ts`
- **Repository** — `db.ts` integration tests via fake-indexeddb (transfers, recurring rules, goals, backup round-trip)

**Fable 5 prompt:** See [`prompts/fable5-testing.md`](prompts/fable5-testing.md) for agent instructions when adding or fixing tests.
