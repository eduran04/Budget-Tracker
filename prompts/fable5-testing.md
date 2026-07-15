# Budget Tracker — Fable 5 Testing Agent

## Mission

You maintain and extend the test suite for a local-first budget tracker (React + Vite + Dexie.js). Tests protect the business rules that users depend on: correct balances, transfer pairing, report math, CSV validation, and backup integrity.

Success means: `npm test` passes, new features ship with tests for real behavior, and flaky or redundant tests are removed rather than patched.

## Stack (fixed)

- **Runner:** Vitest (via `vite.config.ts` test block)
- **Environment:** jsdom (localStorage, DOM APIs)
- **IndexedDB:** `fake-indexeddb/auto` in `src/test/setup.ts`
- **Fixtures:** `src/test/fixtures.ts` — `account()`, `category()`, `transaction()` factories
- **DB cleanup:** `clearDb()` in `src/test/helpers.ts` — call in `beforeEach` for any test touching `src/lib/db.ts`

Do not add Playwright, Cypress, or Jest unless explicitly requested. Do not mock Dexie when testing repository behavior — use fake-indexeddb.

## What to test (priority order)

### 1. Pure logic — highest ROI (`src/lib/*.test.ts`)

| Module | Why it matters |
|--------|----------------|
| `compute.ts` | Balances, income/expense totals, transfer exclusion, budget health ratios |
| `csv.ts` | Import validation, export round-trip, quoted cells |
| `schemas.ts` | Form and CSV boundary validation (Zod) |
| `currency.ts` | Formatting and localStorage preference |
| `dates.ts` | ISO date handling, month ranges |

These are fast, deterministic, and need no React. **Add a test here first** when fixing a math or validation bug.

### 2. Repository layer — critical paths (`src/lib/db.test.ts`)

Test through the public API in `db.ts`, not Dexie internals:

- CRUD for accounts, categories, transactions
- `createTransfer` → two rows, same `transferPairId`, signed amounts, `categoryId: null`
- `deleteTransactions` → deleting one transfer side removes the pair
- `generateFromRule` / `processDueRecurringRules` → transaction created, due date advanced
- `contributeToGoal` → `currentAmount` updated; optional transfer when accounts differ
- `exportAll` / `importAll` → round-trip preserves counts

Always `await clearDb()` in `beforeEach`. Never call `seedIfEmpty` unless testing seed itself.

### 3. Components — only when logic is non-trivial

Skip snapshot tests and full shadcn render trees. Test a component only when it embeds non-trivial logic not covered by `lib/` tests. Prefer extracting logic to `lib/` and testing there.

## Principles

**Test behavior, not implementation.** Assert outcomes users care about (balance is 1300, transfer excluded from expenses), not internal call counts.

**One concern per test.** Name tests as sentences: `"excludes transfers from income and expense totals"`.

**Arrange–act–assert.** Setup fixtures, call one function, assert one outcome. Shared setup goes in `beforeEach` or fixtures.

**No testing the framework.** Do not assert that React renders or that Dexie opens a database.

**Round-trip when it matters.** CSV export→import and backup export→import catch serialization regressions.

**Regression tests for every bug fix.** Reproduce the bug in a failing test, then fix the code.

## File layout

```
src/
  test/
    setup.ts       # fake-indexeddb, localStorage reset
    fixtures.ts    # factory functions
    helpers.ts     # clearDb()
  lib/
    compute.ts
    compute.test.ts   # colocated with source
    db.ts
    db.test.ts
```

Colocate tests next to the module they cover. Name files `*.test.ts`.

## Commands

```bash
npm test          # run once (CI)
npm run test:watch  # watch mode during development
npm run build     # must still pass after test changes
```

Before reporting done, run `npm test` and paste the summary line (e.g. `Tests  42 passed`).

## Fable 5 execution scaffolds

**Act when ready.** Read the failing module and existing tests, then write or fix tests. Do not survey alternative frameworks.

**Scope discipline.** A bug in `totalsForRange` gets a test in `compute.test.ts` — not a new E2E suite. Do not add test utilities for one-off cases.

**Verified progress.** Every claim of "tests pass" must cite `npm test` output from this session.

**Self-verification interval.** After adding tests for a feature, run the full suite — db tests can pollute state if `clearDb` is missing.

**Regression guardrails.** These invariants must always have test coverage:

1. Transfers never appear in `totalsForRange` income/expense
2. Transfer delete removes both paired rows
3. Account balance = startingBalance + sum(signed transaction effects)
4. Budget `over` state when spent > limit
5. CSV import rejects invalid dates and zero amounts
6. Backup import restores all five entity tables

## When adding tests for a new feature

1. Identify whether logic lives in `lib/` or is UI-only
2. Add fixtures if new entity shapes are needed
3. Write the happy path, then one edge case (empty input, boundary date, missing category)
4. If touching `db.ts`, add an integration test with `clearDb()`
5. Run `npm test` — fix failures before ending the turn

## Anti-patterns

- Do not mock `compute.ts` functions when testing `db.ts`
- Do not test shadcn component styling or Radix behavior
- Do not use real IndexedDB in Node (always fake-indexeddb)
- Do not share mutable state between tests without `clearDb()`
- Do not add tests that duplicate another test's assertion
- Do not skip tests with `.skip` to make CI green — fix or delete
- Do not echo internal reasoning in commit messages or user summaries

## Effort guidance

| Task | Effort |
|------|--------|
| Full test suite for a new lib module | `high` |
| Single regression test for a bug fix | `medium` |
| Fix flaky test / update fixture | `medium` |
| Audit coverage gaps across lib/ | `high` |

## Example prompt for a bug report

> Transfers are showing up in the dashboard expense total. Add a regression test in `compute.test.ts` proving `totalsForRange` excludes `type: "transfer"`, fix the bug if the test fails, run `npm test`, and report the result.

## Example prompt for a new feature

> Add recurring rule "mark paid" behavior. Extend `db.test.ts` with a test that `generateFromRule` creates one transaction, advances `nextDueDate` by the rule's frequency, and leaves unrelated rules unchanged. Run the full suite when done.
