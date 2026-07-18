import { format, subMonths } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bulkSetCategory,
  clearAllData,
  clearBalanceOverride,
  contributeToGoal,
  createAccount,
  createGoal,
  createRecurringRule,
  createTransaction,
  createTransfer,
  db,
  deleteAccount,
  deleteCategory,
  deleteGoal,
  deleteRecurringRule,
  deleteTransactions,
  exportAll,
  generateFromRule,
  importAll,
  overrideAccountBalance,
  processDueRecurringRules,
  setAccountArchived,
  updateAccount,
  updateCategory,
  updateGoal,
  updateRecurringRule,
  updateTransaction,
} from "./db";
import { account, category, transaction } from "@/test/fixtures";
import { clearDb } from "@/test/helpers";
import { asEntityId, asIsoDate } from "@/types";

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
      expect(rows[0]?.name).toBe("Checking");
    });

    it("deletes account and its transactions", async () => {
      const id = asEntityId(crypto.randomUUID());
      await db.accounts.add(account({ id }));
      await createTransaction({
        accountId: id,
        categoryId: asEntityId("cat-1"),
        type: "expense",
        amount: 50,
        date: asIsoDate("2026-07-01"),
        description: "Test",
      });
      await deleteAccount(id);
      expect(await db.accounts.count()).toBe(0);
      expect(await db.transactions.count()).toBe(0);
    });

    it("updates and archives an account", async () => {
      const id = asEntityId(crypto.randomUUID());
      await db.accounts.add(account({ id, name: "Old Name" }));
      await updateAccount(id, { name: "New Name" });
      await setAccountArchived(id, true);
      const row = await db.accounts.get(id);
      expect(row?.name).toBe("New Name");
      expect(row?.archived).toBe(true);
    });

    it("overrides and clears balance adjustment", async () => {
      const id = asEntityId(crypto.randomUUID());
      const acc = account({ id, startingBalance: 1000 });
      await db.accounts.add(acc);
      await overrideAccountBalance(acc, [], 1500);
      expect((await db.accounts.get(id))?.balanceAdjustment).toBe(500);
      await clearBalanceOverride(id);
      expect((await db.accounts.get(id))?.balanceAdjustment).toBe(0);
    });
  });

  describe("categories", () => {
    it("deletes category and nulls transaction categoryId", async () => {
      const catId = asEntityId(crypto.randomUUID());
      const accId = asEntityId(crypto.randomUUID());
      await db.categories.add(category({ id: catId }));
      await db.accounts.add(account({ id: accId }));
      await createTransaction({
        accountId: accId,
        categoryId: catId,
        type: "expense",
        amount: 10,
        date: asIsoDate("2026-07-01"),
        description: "Tagged",
      });
      await deleteCategory(catId);
      expect(await db.categories.count()).toBe(0);
      expect((await db.transactions.toArray())[0]?.categoryId).toBeNull();
    });

    it("updates a category", async () => {
      const id = asEntityId(crypto.randomUUID());
      await db.categories.add(category({ id, name: "Food" }));
      await updateCategory(id, { name: "Groceries" });
      expect((await db.categories.get(id))?.name).toBe("Groceries");
    });
  });

  describe("transactions", () => {
    it("updates a transaction and bulk-sets category", async () => {
      const accId = asEntityId(crypto.randomUUID());
      const cat1 = asEntityId(crypto.randomUUID());
      const cat2 = asEntityId(crypto.randomUUID());
      await db.accounts.add(account({ id: accId }));
      await db.categories.bulkAdd([category({ id: cat1 }), category({ id: cat2 })]);
      const txnId = asEntityId(crypto.randomUUID());
      await db.transactions.add(
        transaction({
          id: txnId,
          accountId: accId,
          categoryId: cat1,
          amount: 20,
          description: "Before",
        }),
      );
      await updateTransaction(txnId, { description: "After" });
      await bulkSetCategory([txnId], cat2);
      const row = await db.transactions.get(txnId);
      expect(row?.description).toBe("After");
      expect(row?.categoryId).toBe(cat2);
    });
  });

  describe("transfers", () => {
    it("creates paired transfer rows with shared transferPairId", async () => {
      await db.accounts.bulkAdd([
        account({ id: "from", name: "Checking" }),
        account({ id: "to", name: "Savings" }),
      ]);
      await createTransfer({
        fromAccountId: asEntityId("from"),
        toAccountId: asEntityId("to"),
        amount: 200,
        date: "2026-07-01",
        description: "Move to savings",
      });
      const txns = await db.transactions.toArray();
      expect(txns).toHaveLength(2);
      expect(txns[0]?.type === "transfer" && txns[0].transferPairId).toBe(
        txns[1]?.type === "transfer" ? txns[1].transferPairId : undefined,
      );
      expect(txns[0]?.type).toBe("transfer");
      expect(txns[0]?.categoryId).toBeNull();
      const amounts = txns.map((t) => t.amount).sort((a, b) => a - b);
      expect(amounts).toEqual([-200, 200]);
    });

    it("deleting one transfer side removes the pair", async () => {
      await db.accounts.bulkAdd([
        account({ id: "from" }),
        account({ id: "to" }),
      ]);
      await createTransfer({
        fromAccountId: asEntityId("from"),
        toAccountId: asEntityId("to"),
        amount: 100,
        date: "2026-07-01",
        description: "Transfer",
      });
      const [first] = await db.transactions.toArray();
      expect(first).toBeDefined();
      await deleteTransactions([first!.id]);
      expect(await db.transactions.count()).toBe(0);
    });
  });

  describe("recurring rules", () => {
    it("generates a transaction and advances next due date", async () => {
      await db.accounts.add(account({ id: "acc-1" }));
      await db.categories.add(category({ id: "cat-1" }));
      const ruleId = asEntityId(crypto.randomUUID());
      await db.recurringRules.add({
        id: ruleId,
        accountId: asEntityId("acc-1"),
        categoryId: asEntityId("cat-1"),
        amount: 1800,
        type: "expense",
        description: "Rent",
        frequency: "monthly",
        nextDueDate: asIsoDate("2026-06-01"),
        autoGenerate: false,
      });
      const rule = (await db.recurringRules.get(ruleId))!;
      await generateFromRule(rule, "2026-06-01");
      expect(await db.transactions.count()).toBe(1);
      const updated = await db.recurringRules.get(ruleId);
      expect(updated!.nextDueDate).toBe("2026-07-01");
    });

    it("advances weekly and yearly frequencies", async () => {
      await db.accounts.add(account({ id: "acc-1" }));
      await db.categories.add(category({ id: "cat-1" }));
      const weeklyId = asEntityId(crypto.randomUUID());
      const yearlyId = asEntityId(crypto.randomUUID());
      await db.recurringRules.bulkAdd([
        {
          id: weeklyId,
          accountId: asEntityId("acc-1"),
          categoryId: asEntityId("cat-1"),
          amount: 10,
          type: "expense",
          description: "Weekly",
          frequency: "weekly",
          nextDueDate: asIsoDate("2026-07-01"),
          autoGenerate: false,
        },
        {
          id: yearlyId,
          accountId: asEntityId("acc-1"),
          categoryId: asEntityId("cat-1"),
          amount: 100,
          type: "expense",
          description: "Yearly",
          frequency: "yearly",
          nextDueDate: asIsoDate("2026-01-01"),
          autoGenerate: false,
        },
      ]);
      await generateFromRule((await db.recurringRules.get(weeklyId))!);
      await generateFromRule((await db.recurringRules.get(yearlyId))!);
      expect((await db.recurringRules.get(weeklyId))?.nextDueDate).toBe("2026-07-08");
      expect((await db.recurringRules.get(yearlyId))?.nextDueDate).toBe("2027-01-01");
    });

    it("updates and deletes a recurring rule", async () => {
      await db.accounts.add(account({ id: "acc-1" }));
      await db.categories.add(category({ id: "cat-1" }));
      await createRecurringRule({
        accountId: asEntityId("acc-1"),
        categoryId: asEntityId("cat-1"),
        amount: 15.99,
        type: "expense",
        description: "Netflix",
        frequency: "monthly",
        nextDueDate: asIsoDate("2026-07-01"),
        autoGenerate: false,
      });
      const [rule] = await db.recurringRules.toArray();
      expect(rule).toBeDefined();
      await updateRecurringRule(rule!.id, { amount: 19.99 });
      expect((await db.recurringRules.get(rule!.id))?.amount).toBe(19.99);
      await deleteRecurringRule(rule!.id);
      expect(await db.recurringRules.count()).toBe(0);
    });

    it("auto-generates for past-due rules with autoGenerate on", async () => {
      await db.accounts.add(account({ id: "acc-1" }));
      await db.categories.add(category({ id: "cat-1" }));
      await createRecurringRule({
        accountId: asEntityId("acc-1"),
        categoryId: asEntityId("cat-1"),
        amount: 15.99,
        type: "expense",
        description: "Netflix",
        frequency: "monthly",
        nextDueDate: asIsoDate(format(subMonths(new Date(), 1), "yyyy-MM-dd")),
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
      const goalId = asEntityId(crypto.randomUUID());
      await db.goals.add({
        id: goalId,
        name: "Vacation",
        targetAmount: 3000,
        currentAmount: 500,
        accountId: asEntityId("savings"),
        createdAt: asIsoDate("2026-01-01"),
      });
      const goal = (await db.goals.get(goalId))!;
      await contributeToGoal(goal, 200, asEntityId("checking"));
      const updated = await db.goals.get(goalId);
      expect(updated!.currentAmount).toBe(700);
      expect(await db.transactions.count()).toBe(2);
    });

    it("increments goal without transfer when accounts match", async () => {
      await db.accounts.add(account({ id: "savings" }));
      const goalId = asEntityId(crypto.randomUUID());
      await db.goals.add({
        id: goalId,
        name: "Emergency",
        targetAmount: 1000,
        currentAmount: 100,
        accountId: asEntityId("savings"),
        createdAt: asIsoDate("2026-01-01"),
      });
      const goal = (await db.goals.get(goalId))!;
      await contributeToGoal(goal, 50, asEntityId("savings"));
      expect((await db.goals.get(goalId))?.currentAmount).toBe(150);
      expect(await db.transactions.count()).toBe(0);
    });

    it("creates, updates, and deletes a goal", async () => {
      await db.accounts.add(account({ id: "acc-1" }));
      await createGoal({
        name: "Car",
        targetAmount: 5000,
        currentAmount: 0,
        accountId: asEntityId("acc-1"),
        createdAt: asIsoDate("2026-01-01"),
      });
      const [goal] = await db.goals.toArray();
      expect(goal).toBeDefined();
      await updateGoal(goal!.id, { currentAmount: 250 });
      expect((await db.goals.get(goal!.id))?.currentAmount).toBe(250);
      await deleteGoal(goal!.id);
      expect(await db.goals.count()).toBe(0);
    });
  });

  describe("backup", () => {
    it("export and import round-trips all five entity tables", async () => {
      await db.accounts.add(account({ id: "acc-1" }));
      await db.categories.add(category({ id: "cat-1" }));
      await createTransaction({
        accountId: asEntityId("acc-1"),
        categoryId: asEntityId("cat-1"),
        type: "expense",
        amount: 25,
        date: asIsoDate("2026-07-01"),
        description: "Coffee",
      });
      await createRecurringRule({
        accountId: asEntityId("acc-1"),
        categoryId: asEntityId("cat-1"),
        amount: 1800,
        type: "expense",
        description: "Rent",
        frequency: "monthly",
        nextDueDate: asIsoDate("2099-01-01"),
        autoGenerate: false,
      });
      await db.goals.add({
        id: asEntityId(crypto.randomUUID()),
        name: "Vacation",
        targetAmount: 3000,
        currentAmount: 500,
        accountId: asEntityId("acc-1"),
        createdAt: asIsoDate("2026-01-01"),
      });

      const backup = await exportAll();
      await clearAllData();
      expect(await db.accounts.count()).toBe(0);
      expect(await db.transactions.count()).toBe(0);

      const result = await importAll(backup);
      expect(result.success).toBe(true);
      expect(await db.accounts.count()).toBe(1);
      expect(await db.categories.count()).toBe(1);
      expect(await db.transactions.count()).toBe(1);
      expect(await db.recurringRules.count()).toBe(1);
      expect(await db.goals.count()).toBe(1);
      expect(backup.version).toBe(1);
    });

    it("returns err when import fails", async () => {
      const backup = await exportAll();
      await clearAllData();
      vi.spyOn(db.accounts, "bulkAdd").mockRejectedValueOnce(new Error("disk full"));
      const result = await importAll(backup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("disk full");
      }
    });
  });
});
