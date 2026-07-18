/** Compile-time brand — zero runtime cost. */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type EntityId = Brand<string, "EntityId">;
export type IsoDate = Brand<string, "IsoDate">;

export const asEntityId = (id: string): EntityId => id as EntityId;
export const asIsoDate = (date: string): IsoDate => date as IsoDate;

export type AccountType = "checking" | "savings" | "credit" | "cash" | "other";

export type Account = {
  id: EntityId;
  name: string;
  type: AccountType;
  color: string;
  startingBalance: number;
  /** Signed offset applied on top of the computed balance (manual override). */
  balanceAdjustment?: number | undefined;
  archived: boolean;
};

export type Category = {
  id: EntityId;
  name: string;
  icon: string;
  color: string;
  monthlyLimit?: number | undefined;
};

export type TransactionType = "income" | "expense" | "transfer";

type TransactionBase = {
  id: EntityId;
  accountId: EntityId;
  amount: number;
  date: IsoDate;
  description: string;
  tags?: string[] | undefined;
  recurringId?: EntityId | undefined;
};

/**
 * Amounts are stored positive for income/expense (type determines sign).
 * Transfer rows store signed amounts: negative = money out, positive = money in.
 */
export type IncomeTransaction = TransactionBase & {
  type: "income";
  categoryId: EntityId | null;
};

export type ExpenseTransaction = TransactionBase & {
  type: "expense";
  categoryId: EntityId | null;
};

export type TransferTransaction = TransactionBase & {
  type: "transfer";
  categoryId: null;
  transferPairId: EntityId;
};

export type Transaction =
  | IncomeTransaction
  | ExpenseTransaction
  | TransferTransaction;

export type Frequency = "weekly" | "monthly" | "yearly";

export type RecurringRule = {
  id: EntityId;
  accountId: EntityId;
  categoryId: EntityId;
  amount: number;
  type: "income" | "expense";
  description: string;
  frequency: Frequency;
  nextDueDate: IsoDate;
  autoGenerate: boolean;
};

export type Goal = {
  id: EntityId;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: IsoDate | undefined;
  accountId?: EntityId | undefined;
  createdAt: IsoDate;
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
