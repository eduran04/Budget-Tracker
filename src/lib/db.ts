import Dexie, { type Table } from "dexie";
import { addWeeks, addMonths, addYears, format } from "date-fns";
import type {
  Account,
  AppBackup,
  Category,
  EntityId,
  Goal,
  IsoDate,
  RecurringRule,
  Transaction,
} from "@/types";
import { asEntityId, asIsoDate } from "@/types";
import { accountBalance } from "./compute";
import { err, ok, type Result } from "./result";
import { seedIfEmpty } from "./seed";

class BudgetDB extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  recurringRules!: Table<RecurringRule, string>;
  goals!: Table<Goal, string>;

  constructor() {
    super("budget-tracker");
    this.version(1).stores({
      accounts: "id, archived",
      categories: "id, name",
      transactions:
        "id, accountId, categoryId, type, date, transferPairId, recurringId",
      recurringRules: "id, nextDueDate",
      goals: "id, accountId",
    });
  }
}

export const db = new BudgetDB();

export const newId = (): EntityId => asEntityId(crypto.randomUUID());

/**
 * Runs once on app start: seeds demo data. Materializing due recurring rules
 * is deferred until after first paint (see App.tsx) to keep startup fast.
 */
export async function initDb() {
  await seedIfEmpty(db);
}

// ---------- Accounts ----------

export const createAccount = (account: Omit<Account, "id">) =>
  db.accounts.add({ ...account, id: newId() });

export const updateAccount = (id: EntityId, changes: Partial<Account>) =>
  db.accounts.update(id, changes);

export const setAccountArchived = (id: EntityId, archived: boolean) =>
  db.accounts.update(id, { archived });

/**
 * Overrides the account's displayed balance by folding the needed delta into
 * balanceAdjustment. Transactions are never modified.
 */
export const overrideAccountBalance = (
  account: Account,
  transactions: Transaction[],
  targetBalance: number,
) => {
  const delta = targetBalance - accountBalance(account, transactions);
  return updateAccount(account.id, {
    balanceAdjustment: (account.balanceAdjustment ?? 0) + delta,
  });
};

export const clearBalanceOverride = (id: EntityId) =>
  updateAccount(id, { balanceAdjustment: 0 });

export const deleteAccount = async (id: EntityId) => {
  await db.transaction("rw", db.transactions, db.accounts, async () => {
    await db.transactions.where("accountId").equals(id).delete();
    await db.accounts.delete(id);
  });
};

// ---------- Categories ----------

export const createCategory = (category: Omit<Category, "id">) =>
  db.categories.add({ ...category, id: newId() });

export const updateCategory = (id: EntityId, changes: Partial<Category>) =>
  db.categories.update(id, changes);

export const deleteCategory = async (id: EntityId) => {
  await db.transaction("rw", db.transactions, db.categories, async () => {
    await db.transactions
      .where("categoryId")
      .equals(id)
      .modify({ categoryId: null });
    await db.categories.delete(id);
  });
};

// ---------- Transactions ----------

export const createTransaction = (txn: Omit<Transaction, "id">) =>
  db.transactions.add({ ...txn, id: newId() } as Transaction);

export const updateTransaction = (
  id: EntityId,
  changes: Partial<Transaction>,
) => db.transactions.update(id, changes);

export const deleteTransactions = async (ids: EntityId[]) => {
  // Deleting one side of a transfer removes its pair too.
  const rows = await db.transactions.bulkGet(ids);
  const pairIds = rows
    .filter((r): r is Extract<Transaction, { type: "transfer" }> =>
      r?.type === "transfer",
    )
    .map((r) => r.transferPairId);
  const extra =
    pairIds.length > 0
      ? (await db.transactions.where("transferPairId").anyOf(pairIds).toArray())
          .map((r) => r.id)
          .filter((id) => !ids.includes(id))
      : [];
  await db.transactions.bulkDelete([...ids, ...extra]);
};

export const bulkSetCategory = (ids: EntityId[], categoryId: EntityId) =>
  db.transactions.where("id").anyOf(ids).modify({ categoryId });

export async function createTransfer(input: {
  fromAccountId: EntityId;
  toAccountId: EntityId;
  amount: number;
  date: IsoDate | string;
  description: string;
}) {
  const pairId = newId();
  const date = asIsoDate(input.date);
  const base = {
    categoryId: null,
    type: "transfer" as const,
    date,
    description: input.description,
    transferPairId: pairId,
  };
  await db.transactions.bulkAdd([
    {
      ...base,
      id: newId(),
      accountId: input.fromAccountId,
      amount: -input.amount,
    },
    {
      ...base,
      id: newId(),
      accountId: input.toAccountId,
      amount: input.amount,
    },
  ]);
}

// ---------- Recurring rules ----------

export const createRecurringRule = (rule: Omit<RecurringRule, "id">) =>
  db.recurringRules.add({ ...rule, id: newId() });

export const updateRecurringRule = (
  id: EntityId,
  changes: Partial<RecurringRule>,
) => db.recurringRules.update(id, changes);

export const deleteRecurringRule = (id: EntityId) =>
  db.recurringRules.delete(id);

function advance(
  date: IsoDate,
  frequency: RecurringRule["frequency"],
): IsoDate {
  const d = new Date(`${date}T00:00:00`);
  const next =
    frequency === "weekly"
      ? addWeeks(d, 1)
      : frequency === "monthly"
        ? addMonths(d, 1)
        : addYears(d, 1);
  return asIsoDate(format(next, "yyyy-MM-dd"));
}

/** Creates the concrete transaction for a due rule and advances its next due date. */
export async function generateFromRule(
  rule: RecurringRule,
  date?: IsoDate | string,
) {
  await db.transaction("rw", db.transactions, db.recurringRules, async () => {
    await db.transactions.add({
      id: newId(),
      accountId: rule.accountId,
      categoryId: rule.categoryId,
      type: rule.type,
      amount: rule.amount,
      date: asIsoDate(date ?? rule.nextDueDate),
      description: rule.description,
      recurringId: rule.id,
    });
    await db.recurringRules.update(rule.id, {
      nextDueDate: advance(rule.nextDueDate, rule.frequency),
    });
  });
}

/** Auto-generates transactions for every past-due rule with autoGenerate on. */
export async function processDueRecurringRules() {
  const today = format(new Date(), "yyyy-MM-dd");
  let generated = 0;
  // Loop because a rule several periods overdue needs multiple transactions.
  for (let guard = 0; guard < 120; guard++) {
    const due = await db.recurringRules
      .where("nextDueDate")
      .belowOrEqual(today)
      .toArray();
    const auto = due.filter((r) => r.autoGenerate);
    if (auto.length === 0) break;
    for (const rule of auto) {
      await generateFromRule(rule);
      generated++;
    }
  }
  return generated;
}

// ---------- Goals ----------

export const createGoal = (goal: Omit<Goal, "id">) =>
  db.goals.add({ ...goal, id: newId() });

export const updateGoal = (id: EntityId, changes: Partial<Goal>) =>
  db.goals.update(id, changes);

export const deleteGoal = (id: EntityId) => db.goals.delete(id);

/**
 * Records a contribution. Always increments the goal's saved amount; when both
 * a source account and a linked account exist, also moves the money as a transfer.
 */
export async function contributeToGoal(
  goal: Goal,
  amount: number,
  fromAccountId?: EntityId,
) {
  await db.transaction("rw", db.goals, db.transactions, async () => {
    await db.goals.update(goal.id, {
      currentAmount: goal.currentAmount + amount,
    });
    if (fromAccountId && goal.accountId && fromAccountId !== goal.accountId) {
      await createTransfer({
        fromAccountId,
        toAccountId: goal.accountId,
        amount,
        date: format(new Date(), "yyyy-MM-dd"),
        description: `Contribution to goal: ${goal.name}`,
      });
    }
  });
}

// ---------- Backup / restore ----------

export async function exportAll(): Promise<AppBackup> {
  const [accounts, categories, transactions, recurringRules, goals] =
    await Promise.all([
      db.accounts.toArray(),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.recurringRules.toArray(),
      db.goals.toArray(),
    ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions,
    recurringRules,
    goals,
  };
}

export async function importAll(
  backup: AppBackup,
): Promise<Result<void, string>> {
  try {
    await db.transaction(
      "rw",
      [
        db.accounts,
        db.categories,
        db.transactions,
        db.recurringRules,
        db.goals,
      ],
      async () => {
        await Promise.all([
          db.accounts.clear(),
          db.categories.clear(),
          db.transactions.clear(),
          db.recurringRules.clear(),
          db.goals.clear(),
        ]);
        await Promise.all([
          db.accounts.bulkAdd(backup.accounts),
          db.categories.bulkAdd(backup.categories),
          db.transactions.bulkAdd(backup.transactions),
          db.recurringRules.bulkAdd(backup.recurringRules),
          db.goals.bulkAdd(backup.goals),
        ]);
      },
    );
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Import failed");
  }
}

export async function clearAllData() {
  await db.transaction(
    "rw",
    [db.accounts, db.categories, db.transactions, db.recurringRules, db.goals],
    async () => {
      await Promise.all([
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.recurringRules.clear(),
        db.goals.clear(),
      ]);
    },
  );
}
