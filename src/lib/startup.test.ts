import { beforeEach, describe, expect, it } from "vitest";
import { db, initDb, processDueRecurringRules } from "./db";
import { clearDb } from "@/test/helpers";

/**
 * Startup regression guards. Thresholds are generous for CI — they exist to
 * catch pathological slowdowns (e.g. blocking work creeping back into
 * initDb), not to micro-benchmark.
 */
describe("startup", () => {
  beforeEach(async () => {
    await clearDb();
    localStorage.clear();
  });

  it("initDb on an empty database seeds and completes within 500ms", async () => {
    const start = performance.now();
    await initDb();
    const elapsed = performance.now() - start;
    expect(await db.accounts.count()).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });

  it("initDb on an already-seeded database completes within 100ms", async () => {
    await initDb();
    const start = performance.now();
    await initDb();
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it("initDb does not process recurring rules (deferred to after first paint)", async () => {
    await initDb();
    // Seed rules are manual (autoGenerate: false), so nothing should have
    // been materialized from them at startup.
    const generated = await db.transactions
      .filter((t) => t.recurringId != null)
      .count();
    expect(generated).toBe(0);
  });

  it("processDueRecurringRules is a fast no-op when no auto-generate rules are due", async () => {
    await initDb();
    const start = performance.now();
    const generated = await processDueRecurringRules();
    const elapsed = performance.now() - start;
    expect(generated).toBe(0);
    expect(elapsed).toBeLessThan(100);
  });
});
