import { format, subMonths } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllData,
  contributeToGoal,
  createAccount,
  createRecurringRule,
  createTransaction,
  createTransfer,
  db,
  deleteAccount,
  deleteTransactions,
  exportAll,
  generateFromRule,
  importAll,
  processDueRecurringRules,
} from "./db";
import { account, category } from "@/test/fixtures";
import { clearDb } from "@/test/helpers";

describe("db repository", () => {
  beforeEach(async () => {
    await clearDb();
  });

  describe("accounts", () => {
    it("creates and retrieves an account", async () => {
      const { id: _id, ...data } = account({ name: "Checking" });
      await createAccount(data);
      const rows = await db.accounts.toArray();
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Checking");
    });

    it("deletes account and its transactions", async () => {
      const id = crypto.randomUUID();
      await db.accounts.add(account({ id }));
      await createTransaction({
        accountId: id,
        categoryId: "cat-1",
        type: "expense",
        amount: 50,
        date: "2026-07-01",
        description: "Test",
      });
      await deleteAccount(id);
      expect(await db.accounts.count()).toBe(0);
      expect(await db.transactions.count()).toBe(0);
    });
  });

  describe("transfers", () => {
    it("creates paired transfer rows with shared transferPairId", async () => {
      await db.accounts.bulkAdd([
        account({ id: "from", name: "Checking" }),
        account({ id: "to", name: "Savings" }),
      ]);
      await createTransfer({
        fromAccountId: "from",
        toAccountId: "to",
        amount: 200,
        date: "2026-07-01",
        description: "Move to savings",
      });
      const txns = await db.transactions.toArray();
      expect(txns).toHaveLength(2);
      expect(txns[0].transferPairId).toBe(txns[1].transferPairId);
      expect(txns[0].type).toBe("transfer");
      expect(txns[0].categoryId).toBeNull();
      const amounts = txns.map((t) => t.amount).sort((a, b) => a - b);
      expect(amounts).toEqual([-200, 200]);
    });

    it("deleting one transfer side removes the pair", async () => {
      await db.accounts.bulkAdd([
        account({ id: "from" }),
        account({ id: "to" }),
      ]);
      await createTransfer({
        fromAccountId: "from",
        toAccountId: "to",
        amount: 100,
        date: "2026-07-01",
        description: "Transfer",
      });
      const [first] = await db.transactions.toArray();
      await deleteTransactions([first.id]);
      expect(await db.transactions.count()).toBe(0);
    });
  });

  describe("recurring rules", () => {
    it("generates a transaction and advances next due date", async () => {
      await db.accounts.add(account({ id: "acc-1" }));
      await db.categories.add(category({ id: "cat-1" }));
      const ruleId = crypto.randomUUID();
      await db.recurringRules.add({
        id: ruleId,
        accountId: "acc-1",
        categoryId: "cat-1",
        amount: 1800,
        type: "expense",
        description: "Rent",
        frequency: "monthly",
        nextDueDate: "2026-06-01",
        autoGenerate: false,
      });
      const rule = (await db.recurringRules.get(ruleId))!;
      await generateFromRule(rule, "2026-06-01");
      expect(await db.transactions.count()).toBe(1);
      const updated = await db.recurringRules.get(ruleId);
      expect(updated!.nextDueDate).toBe("2026-07-01");
    });

    it("auto-generates for past-due rules with autoGenerate on", async () => {
      await db.accounts.add(account({ id: "acc-1" }));
      await db.categories.add(category({ id: "cat-1" }));
      await createRecurringRule({
        accountId: "acc-1",
        categoryId: "cat-1",
        amount: 15.99,
        type: "expense",
        description: "Netflix",
        frequency: "monthly",
        nextDueDate: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
        autoGenerate: true,
      });
      const count = await processDueRecurringRules();
      expect(count).toBeGreaterThan(0);
      expect(await db.transactions.count()).toBeGreaterThan(0);
    });
  });

  describe("goals", () => {
    it("increments currentAmount on contribution", async () => {
      await db.accounts.bulkAdd([
        account({ id: "savings" }),
        account({ id: "checking" }),
      ]);
      const goalId = crypto.randomUUID();
      await db.goals.add({
        id: goalId,
        name: "Vacation",
        targetAmount: 3000,
        currentAmount: 500,
        accountId: "savings",
        createdAt: "2026-01-01",
      });
      const goal = (await db.goals.get(goalId))!;
      await contributeToGoal(goal, 200, "checking");
      const updated = await db.goals.get(goalId);
      expect(updated!.currentAmount).toBe(700);
      expect(await db.transactions.count()).toBe(2);
    });
  });

  describe("backup", () => {
    it("export and import round-trips all five entity tables", async () => {
      await db.accounts.add(account({ id: "acc-1" }));
      await db.categories.add(category({ id: "cat-1" }));
      await createTransaction({
        accountId: "acc-1",
        categoryId: "cat-1",
        type: "expense",
        amount: 25,
        date: "2026-07-01",
        description: "Coffee",
      });
      await createRecurringRule({
        accountId: "acc-1",
        categoryId: "cat-1",
        amount: 1800,
        type: "expense",
        description: "Rent",
        frequency: "monthly",
        nextDueDate: "2099-01-01",
        autoGenerate: false,
      });
      await db.goals.add({
        id: crypto.randomUUID(),
        name: "Vacation",
        targetAmount: 3000,
        currentAmount: 500,
        accountId: "acc-1",
        createdAt: "2026-01-01",
      });

      const backup = await exportAll();
      await clearAllData();
      expect(await db.accounts.count()).toBe(0);
      expect(await db.transactions.count()).toBe(0);

      await importAll(backup);
      expect(await db.accounts.count()).toBe(1);
      expect(await db.categories.count()).toBe(1);
      expect(await db.transactions.count()).toBe(1);
      expect(await db.recurringRules.count()).toBe(1);
      expect(await db.goals.count()).toBe(1);
      expect(backup.version).toBe(1);
    });
  });
});
