import type {
  Account,
  Category,
  ExpenseTransaction,
  Transaction,
} from "@/types";
import { asEntityId, asIsoDate } from "@/types";

type AccountOverrides = Omit<Partial<Account>, "id"> & { id?: string };

export const account = (overrides: AccountOverrides = {}): Account => {
  const { id, ...rest } = overrides;
  return {
    id: asEntityId(id ?? "acc-1"),
    name: "Checking",
    type: "checking",
    color: "#3b82f6",
    startingBalance: 1000,
    archived: false,
    ...rest,
  };
};

type CategoryOverrides = Omit<Partial<Category>, "id"> & { id?: string };

export const category = (overrides: CategoryOverrides = {}): Category => {
  const { id, ...rest } = overrides;
  return {
    id: asEntityId(id ?? "cat-1"),
    name: "Groceries",
    icon: "shopping-cart",
    color: "#10b981",
    monthlyLimit: 500,
    ...rest,
  };
};

type TransactionOverrides = Omit<
  Partial<ExpenseTransaction>,
  "id" | "accountId" | "categoryId" | "date" | "type" | "transferPairId"
> & {
  id?: string;
  accountId?: string;
  categoryId?: string | null;
  date?: string;
  type?: Transaction["type"];
  transferPairId?: string;
};

export const transaction = (
  overrides: TransactionOverrides = {},
): Transaction => {
  const {
    id,
    accountId,
    categoryId,
    date,
    type = "expense",
    transferPairId,
    ...rest
  } = overrides;

  if (type === "transfer") {
    return {
      id: asEntityId(id ?? "txn-1"),
      accountId: asEntityId(accountId ?? "acc-1"),
      categoryId: null,
      type: "transfer",
      amount: 50,
      date: asIsoDate(date ?? "2026-07-01"),
      description: "Test purchase",
      transferPairId: asEntityId(transferPairId ?? "pair-1"),
      ...rest,
    };
  }

  return {
    id: asEntityId(id ?? "txn-1"),
    accountId: asEntityId(accountId ?? "acc-1"),
    categoryId:
      categoryId === null ? null : asEntityId(categoryId ?? "cat-1"),
    type,
    amount: 50,
    date: asIsoDate(date ?? "2026-07-01"),
    description: "Test purchase",
    ...rest,
  };
};
