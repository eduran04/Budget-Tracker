import type { Account, Category, Transaction } from "@/types";

export const account = (
  overrides: Partial<Account> = {},
): Account => ({
  id: "acc-1",
  name: "Checking",
  type: "checking",
  color: "#3b82f6",
  startingBalance: 1000,
  archived: false,
  ...overrides,
});

export const category = (
  overrides: Partial<Category> = {},
): Category => ({
  id: "cat-1",
  name: "Groceries",
  icon: "shopping-cart",
  color: "#10b981",
  monthlyLimit: 500,
  ...overrides,
});

export const transaction = (
  overrides: Partial<Transaction> = {},
): Transaction => ({
  id: "txn-1",
  accountId: "acc-1",
  categoryId: "cat-1",
  type: "expense",
  amount: 50,
  date: "2026-07-01",
  description: "Test purchase",
  ...overrides,
});
