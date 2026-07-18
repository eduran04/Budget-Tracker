import { describe, expect, it } from "vitest";
import {
  accountSchema,
  backupSchema,
  categorySchema,
  csvRowSchema,
  goalSchema,
  recurringSchema,
  transactionSchema,
  transferSchema,
} from "./schemas";

describe("transactionSchema", () => {
  const valid = {
    accountId: "acc-1",
    categoryId: "cat-1",
    type: "expense" as const,
    amount: "50.00",
    date: "2026-07-01",
    description: "Groceries",
  };

  it("accepts valid input", () => {
    expect(transactionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = transactionSchema.safeParse({ ...valid, date: "07/01/2026" });
    expect(result.success).toBe(false);
  });

  it("rejects zero or negative amounts", () => {
    expect(transactionSchema.safeParse({ ...valid, amount: "0" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...valid, amount: "-10" }).success).toBe(false);
  });
});

describe("transferSchema", () => {
  it("rejects same from and to account", () => {
    const result = transferSchema.safeParse({
      fromAccountId: "acc-1",
      toAccountId: "acc-1",
      amount: "100",
      date: "2026-07-01",
      description: "Transfer",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("different"))).toBe(true);
    }
  });
});

describe("accountSchema", () => {
  it("accepts negative starting balance for credit accounts", () => {
    const result = accountSchema.safeParse({
      name: "Credit Card",
      type: "credit",
      color: "#f59e0b",
      startingBalance: "-340",
    });
    expect(result.success).toBe(true);
  });
});

describe("categorySchema", () => {
  it("allows empty monthly limit", () => {
    expect(
      categorySchema.safeParse({
        name: "Other",
        icon: "circle-ellipsis",
        color: "#737373",
      }).success,
    ).toBe(true);
  });

  it("rejects non-positive limit when provided", () => {
    expect(
      categorySchema.safeParse({
        name: "Rent",
        icon: "home",
        color: "#3b82f6",
        monthlyLimit: "0",
      }).success,
    ).toBe(false);
  });
});

describe("recurringSchema", () => {
  it("requires autoGenerate boolean", () => {
    const result = recurringSchema.safeParse({
      accountId: "acc-1",
      categoryId: "cat-1",
      amount: "1800",
      type: "expense",
      description: "Rent",
      frequency: "monthly",
      nextDueDate: "2026-08-01",
      autoGenerate: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("goalSchema", () => {
  it("accepts optional empty deadline", () => {
    expect(
      goalSchema.safeParse({
        name: "Emergency fund",
        targetAmount: "10000",
        deadline: "",
      }).success,
    ).toBe(true);
  });
});

describe("csvRowSchema", () => {
  it("rejects zero amount", () => {
    expect(
      csvRowSchema.safeParse({
        date: "2026-07-01",
        description: "Test",
        amount: 0,
        type: "expense",
      }).success,
    ).toBe(false);
  });
});

describe("backupSchema", () => {
  it("requires version 1 and all entity arrays", () => {
    const result = backupSchema.safeParse({
      version: 1,
      exportedAt: "2026-07-01T00:00:00.000Z",
      accounts: [],
      categories: [],
      transactions: [],
      recurringRules: [],
      goals: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects wrong version", () => {
    const result = backupSchema.safeParse({
      version: 2,
      exportedAt: "2026-07-01T00:00:00.000Z",
      accounts: [],
      categories: [],
      transactions: [],
      recurringRules: [],
      goals: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a full entity round-trip fixture without casts", () => {
    const fixture = {
      version: 1 as const,
      exportedAt: "2026-07-01T00:00:00.000Z",
      accounts: [
        {
          id: "acc-1",
          name: "Checking",
          type: "checking",
          color: "#3b82f6",
          startingBalance: 1000,
          archived: false,
        },
      ],
      categories: [
        {
          id: "cat-1",
          name: "Groceries",
          icon: "shopping-cart",
          color: "#10b981",
          monthlyLimit: 500,
        },
      ],
      transactions: [
        {
          id: "txn-1",
          accountId: "acc-1",
          categoryId: "cat-1",
          type: "expense",
          amount: 25,
          date: "2026-07-01",
          description: "Lunch",
        },
        {
          id: "txn-2",
          accountId: "acc-1",
          categoryId: null,
          type: "transfer",
          amount: -100,
          date: "2026-07-02",
          description: "Transfer out",
          transferPairId: "pair-1",
        },
      ],
      recurringRules: [
        {
          id: "rule-1",
          accountId: "acc-1",
          categoryId: "cat-1",
          amount: 1800,
          type: "expense",
          description: "Rent",
          frequency: "monthly",
          nextDueDate: "2026-08-01",
          autoGenerate: true,
        },
      ],
      goals: [
        {
          id: "goal-1",
          name: "Emergency",
          targetAmount: 10000,
          currentAmount: 2000,
          createdAt: "2026-01-01",
          accountId: "acc-1",
        },
      ],
    };
    const result = backupSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accounts[0]?.id).toBe("acc-1");
      expect(result.data.transactions[1]?.type).toBe("transfer");
      expect(result.data.goals[0]?.createdAt).toBe("2026-01-01");
    }
  });

  it("rejects transfer rows missing transferPairId", () => {
    const result = backupSchema.safeParse({
      version: 1,
      exportedAt: "2026-07-01T00:00:00.000Z",
      accounts: [],
      categories: [],
      transactions: [
        {
          id: "txn-1",
          accountId: "acc-1",
          categoryId: null,
          type: "transfer",
          amount: -50,
          date: "2026-07-01",
          description: "Broken transfer",
        },
      ],
      recurringRules: [],
      goals: [],
    });
    expect(result.success).toBe(false);
  });
});
