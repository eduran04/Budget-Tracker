import type { Account, Category, Transaction } from "@/types";

/** How credit-card balances are rendered on the Accounts page. */
export type CreditDisplayMode =
  | "signed-negative"
  | "owed-suffix"
  | "parentheses"
  | "label-above";

/**
 * Credit accounts store liability as a negative balance.
 * Users enter amount owed as a positive number; legacy rows may already be negative.
 */
export function effectiveStartingBalance(account: Account): number {
  if (account.type === "credit") return -Math.abs(account.startingBalance);
  return account.startingBalance;
}

/** Amount owed on a credit account, always >= 0. */
export function creditAmountOwed(balance: number): number {
  return Math.max(0, -balance);
}

/**
 * Signed effect of a transaction on its account's balance.
 * Income adds, expense subtracts, transfer rows carry their own sign.
 */
export function balanceEffect(t: Transaction): number {
  switch (t.type) {
    case "income":
      return t.amount;
    case "expense":
      return -t.amount;
    case "transfer":
      return t.amount;
    default: {
      const _exhaustive: never = t;
      throw new Error(`Unhandled transaction type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function accountBalance(
  account: Account,
  transactions: Transaction[],
): number {
  return transactions
    .filter((t) => t.accountId === account.id)
    .reduce(
      (sum, t) => sum + balanceEffect(t),
      effectiveStartingBalance(account) + (account.balanceAdjustment ?? 0),
    );
}

export const inRange = (t: Transaction, from: string, to: string) =>
  t.date >= from && t.date <= to;

/** Income/expense totals for a date range; transfers excluded. */
export function totalsForRange(
  transactions: Transaction[],
  from: string,
  to: string,
) {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === "transfer" || !inRange(t, from, to)) continue;
    if (t.type === "income") income += t.amount;
    else expenses += t.amount;
  }
  return { income, expenses, net: income - expenses };
}

/** Expense total per category for a date range; transfers excluded. */
export function spentByCategory(
  transactions: Transaction[],
  from: string,
  to: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.categoryId || !inRange(t, from, to)) continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  return map;
}

export type BudgetStatus = {
  category: Category;
  spent: number;
  limit: number;
  ratio: number;
  state: "ok" | "warning" | "over";
};

export function budgetStatuses(
  categories: Category[],
  transactions: Transaction[],
  from: string,
  to: string,
): BudgetStatus[] {
  const spent = spentByCategory(transactions, from, to);
  return categories
    .filter((c) => c.monthlyLimit && c.monthlyLimit > 0)
    .map((category) => {
      const s = spent.get(category.id) ?? 0;
      const limit = category.monthlyLimit!;
      const ratio = s / limit;
      return {
        category,
        spent: s,
        limit,
        ratio,
        state: ratio > 1 ? ("over" as const) : ratio >= 0.8 ? ("warning" as const) : ("ok" as const),
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}
