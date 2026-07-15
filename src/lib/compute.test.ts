import { describe, expect, it } from "vitest";
import {
  accountBalance,
  balanceEffect,
  budgetStatuses,
  spentByCategory,
  totalsForRange,
} from "./compute";
import { account, category, transaction } from "@/test/fixtures";

describe("balanceEffect", () => {
  it("returns positive amount for income", () => {
    expect(balanceEffect(transaction({ type: "income", amount: 100 }))).toBe(100);
  });

  it("returns negative amount for expense", () => {
    expect(balanceEffect(transaction({ type: "expense", amount: 75 }))).toBe(-75);
  });

  it("returns signed amount for transfer rows", () => {
    expect(balanceEffect(transaction({ type: "transfer", amount: -200 }))).toBe(-200);
    expect(balanceEffect(transaction({ type: "transfer", amount: 200 }))).toBe(200);
  });
});

describe("accountBalance", () => {
  it("starts from startingBalance with no transactions", () => {
    expect(accountBalance(account({ startingBalance: 2450 }), [])).toBe(2450);
  });

  it("treats credit starting balance as liability regardless of sign stored", () => {
    expect(
      accountBalance(account({ type: "credit", startingBalance: 500 }), []),
    ).toBe(-500);
    expect(
      accountBalance(account({ type: "credit", startingBalance: -340 }), []),
    ).toBe(-340);
  });

  it("increases credit debt on expense and reduces it on payment transfer", () => {
    const acc = account({ id: "cc-1", type: "credit", startingBalance: 500 });
    const txns = [
      transaction({ accountId: "cc-1", type: "expense", amount: 100 }),
      transaction({ accountId: "cc-1", type: "transfer", amount: 200 }),
    ];
    expect(accountBalance(acc, txns)).toBe(-400);
  });

  it("sums income and expenses for the account", () => {
    const acc = account({ id: "acc-1", startingBalance: 1000 });
    const txns = [
      transaction({ accountId: "acc-1", type: "income", amount: 500 }),
      transaction({ accountId: "acc-1", type: "expense", amount: 200 }),
      transaction({ accountId: "acc-2", type: "expense", amount: 999 }),
    ];
    expect(accountBalance(acc, txns)).toBe(1300);
  });

  it("handles transfer in and out on the same account", () => {
    const acc = account({ id: "acc-1", startingBalance: 500 });
    const txns = [
      transaction({ accountId: "acc-1", type: "transfer", amount: -100 }),
      transaction({ accountId: "acc-1", type: "transfer", amount: 50 }),
    ];
    expect(accountBalance(acc, txns)).toBe(450);
  });
});

describe("totalsForRange", () => {
  const txns = [
    transaction({ type: "income", amount: 4000, date: "2026-07-01" }),
    transaction({ type: "expense", amount: 800, date: "2026-07-15" }),
    transaction({ type: "expense", amount: 200, date: "2026-06-01" }),
    transaction({
      type: "transfer",
      amount: -500,
      date: "2026-07-10",
      categoryId: null,
    }),
  ];

  it("totals income and expenses within date range", () => {
    const result = totalsForRange(txns, "2026-07-01", "2026-07-31");
    expect(result).toEqual({ income: 4000, expenses: 800, net: 3200 });
  });

  it("excludes transfers from income and expense totals", () => {
    const result = totalsForRange(txns, "2026-07-01", "2026-07-31");
    expect(result.income).toBe(4000);
    expect(result.expenses).toBe(800);
  });

  it("excludes transactions outside the range", () => {
    const result = totalsForRange(txns, "2026-07-01", "2026-07-31");
    expect(result.expenses).toBe(800);
  });
});

describe("spentByCategory", () => {
  it("aggregates expenses by category within range", () => {
    const txns = [
      transaction({ categoryId: "cat-1", type: "expense", amount: 100, date: "2026-07-01" }),
      transaction({ categoryId: "cat-1", type: "expense", amount: 50, date: "2026-07-15" }),
      transaction({ categoryId: "cat-2", type: "expense", amount: 200, date: "2026-07-10" }),
      transaction({ categoryId: "cat-1", type: "income", amount: 500, date: "2026-07-05" }),
    ];
    const spent = spentByCategory(txns, "2026-07-01", "2026-07-31");
    expect(spent.get("cat-1")).toBe(150);
    expect(spent.get("cat-2")).toBe(200);
  });

  it("ignores transfers and null categoryId", () => {
    const txns = [
      transaction({ type: "transfer", amount: -100, categoryId: null, date: "2026-07-01" }),
    ];
    expect(spentByCategory(txns, "2026-07-01", "2026-07-31").size).toBe(0);
  });
});

describe("budgetStatuses", () => {
  const categories = [
    category({ id: "cat-1", monthlyLimit: 100 }),
    category({ id: "cat-2", monthlyLimit: 200 }),
    category({ id: "cat-3", name: "No limit", monthlyLimit: undefined }),
  ];
  const txns = [
    transaction({ categoryId: "cat-1", amount: 50, date: "2026-07-01" }),
    transaction({ categoryId: "cat-2", amount: 170, date: "2026-07-01" }),
    transaction({ categoryId: "cat-2", amount: 35, date: "2026-07-15" }),
  ];

  it("assigns ok, warning, and over states by ratio", () => {
    const statuses = budgetStatuses(categories, txns, "2026-07-01", "2026-07-31");
    const byId = Object.fromEntries(statuses.map((s) => [s.category.id, s.state]));
    expect(byId["cat-1"]).toBe("ok");
    expect(byId["cat-2"]).toBe("over");
  });

  it("treats exactly 100% spent as warning, not over", () => {
    const statuses = budgetStatuses(
      [category({ id: "cat-2", monthlyLimit: 200 })],
      [transaction({ categoryId: "cat-2", amount: 200, date: "2026-07-01" })],
      "2026-07-01",
      "2026-07-31",
    );
    expect(statuses[0].state).toBe("warning");
  });

  it("sorts by highest ratio first", () => {
    const statuses = budgetStatuses(categories, txns, "2026-07-01", "2026-07-31");
    expect(statuses[0].category.id).toBe("cat-2");
  });

  it("skips categories without a monthly limit", () => {
    const statuses = budgetStatuses(categories, txns, "2026-07-01", "2026-07-31");
    expect(statuses.some((s) => s.category.id === "cat-3")).toBe(false);
  });
});
