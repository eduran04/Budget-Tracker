export type AccountType = "checking" | "savings" | "credit" | "cash" | "other";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  startingBalance: number;
  /** Signed offset applied on top of the computed balance (manual override). */
  balanceAdjustment?: number;
  archived: boolean;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthlyLimit?: number;
};

export type TransactionType = "income" | "expense" | "transfer";

/**
 * Amounts are stored positive for income/expense (type determines sign).
 * Transfer rows store signed amounts: negative = money out, positive = money in.
 */
export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  date: string; // yyyy-MM-dd
  description: string;
  tags?: string[];
  transferPairId?: string;
  recurringId?: string;
};

export type Frequency = "weekly" | "monthly" | "yearly";

export type RecurringRule = {
  id: string;
  accountId: string;
  categoryId: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  frequency: Frequency;
  nextDueDate: string; // yyyy-MM-dd
  autoGenerate: boolean;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // yyyy-MM-dd
  accountId?: string;
  createdAt: string; // yyyy-MM-dd
};

export type AppBackup = {
  version: 1;
  exportedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  goals: Goal[];
};
