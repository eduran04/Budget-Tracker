import { format, subMonths, setDate } from "date-fns";
import type Dexie from "dexie";
import type { Table } from "dexie";
import type {
  Account,
  Category,
  EntityId,
  Goal,
  RecurringRule,
  Transaction,
} from "@/types";
import { asEntityId, asIsoDate } from "@/types";

type SeedDB = Dexie & {
  accounts: Table<Account, string>;
  categories: Table<Category, string>;
  transactions: Table<Transaction, string>;
  recurringRules: Table<RecurringRule, string>;
  goals: Table<Goal, string>;
};

const id = () => asEntityId(crypto.randomUUID());

export async function seedIfEmpty(db: SeedDB) {
  const seeded = localStorage.getItem("seeded");
  const accountCount = await db.accounts.count();
  if (seeded || accountCount > 0) return;

  const checking: Account = {
    id: id(),
    name: "Checking",
    type: "checking",
    color: "#3b82f6",
    startingBalance: 2450,
    archived: false,
  };
  const savings: Account = {
    id: id(),
    name: "Savings",
    type: "savings",
    color: "#10b981",
    startingBalance: 8200,
    archived: false,
  };
  const credit: Account = {
    id: id(),
    name: "Credit Card",
    type: "credit",
    color: "#f59e0b",
    startingBalance: -340,
    archived: false,
  };

  const cat = (
    name: string,
    icon: string,
    color: string,
    monthlyLimit?: number,
  ): Category =>
    monthlyLimit === undefined
      ? { id: id(), name, icon, color }
      : { id: id(), name, icon, color, monthlyLimit };

  const groceries = cat("Groceries", "shopping-cart", "#10b981", 600);
  const rent = cat("Rent", "home", "#3b82f6", 1800);
  const utilities = cat("Utilities", "zap", "#eab308", 150);
  const transport = cat("Transport", "car", "#06b6d4", 200);
  const dining = cat("Dining", "utensils", "#f43f5e", 300);
  const entertainment = cat("Entertainment", "clapperboard", "#8b5cf6", 100);
  const health = cat("Health", "heart-pulse", "#ec4899", 100);
  const subscriptions = cat("Subscriptions", "repeat", "#f97316", 80);
  const other = cat("Other", "circle-ellipsis", "#737373", 200);
  const income = cat("Income", "banknote", "#22c55e");

  const categories = [
    groceries,
    rent,
    utilities,
    transport,
    dining,
    entertainment,
    health,
    subscriptions,
    other,
    income,
  ];

  // Build ~6 months of history relative to today.
  const now = new Date();
  const txns: Transaction[] = [];
  const t = (
    monthsAgo: number,
    day: number,
    accountId: EntityId,
    categoryId: EntityId | null,
    type: "income" | "expense",
    amount: number,
    description: string,
  ) => {
    const date = asIsoDate(
      format(setDate(subMonths(now, monthsAgo), day), "yyyy-MM-dd"),
    );
    txns.push({
      id: id(),
      accountId,
      categoryId,
      type,
      amount,
      date,
      description,
    });
  };

  for (let m = 5; m >= 0; m--) {
    t(m, 1, checking.id, income.id, "income", 4250, "Monthly salary");
    t(m, 2, checking.id, rent.id, "expense", 1800, "Rent payment");
    t(m, 5, checking.id, utilities.id, "expense", 95 + m * 7, "Electric & water bill");
    t(m, 8, credit.id, groceries.id, "expense", 320 + m * 25, "Whole Foods Market");
    t(m, 12, credit.id, dining.id, "expense", 85 + m * 12, "Restaurants");
    t(m, 15, checking.id, transport.id, "expense", 60 + m * 8, "Gas & rideshare");
    t(m, 18, credit.id, subscriptions.id, "expense", 42, "Netflix, Spotify, iCloud");
    if (m % 2 === 0) {
      t(m, 20, credit.id, entertainment.id, "expense", 55, "Movies & games");
      t(m, 22, checking.id, health.id, "expense", 40, "Pharmacy");
    }
  }
  // A few current-month extras so the dashboard feels alive
  t(0, 10, credit.id, groceries.id, "expense", 84.5, "Trader Joe's");
  t(0, 14, credit.id, dining.id, "expense", 62.3, "Dinner with friends");
  t(0, 16, checking.id, other.id, "expense", 35, "Gifts");

  const rules: RecurringRule[] = [
    {
      id: id(),
      accountId: checking.id,
      categoryId: income.id,
      amount: 4250,
      type: "income",
      description: "Monthly salary",
      frequency: "monthly",
      nextDueDate: asIsoDate(
        format(setDate(subMonths(now, -1), 1), "yyyy-MM-dd"),
      ),
      autoGenerate: false,
    },
    {
      id: id(),
      accountId: checking.id,
      categoryId: rent.id,
      amount: 1800,
      type: "expense",
      description: "Rent payment",
      frequency: "monthly",
      nextDueDate: asIsoDate(
        format(setDate(subMonths(now, -1), 2), "yyyy-MM-dd"),
      ),
      autoGenerate: false,
    },
    {
      id: id(),
      accountId: credit.id,
      categoryId: subscriptions.id,
      amount: 15.99,
      type: "expense",
      description: "Netflix",
      frequency: "monthly",
      nextDueDate: asIsoDate(
        format(setDate(subMonths(now, -1), 18), "yyyy-MM-dd"),
      ),
      autoGenerate: false,
    },
  ];

  const goals: Goal[] = [
    {
      id: id(),
      name: "Emergency fund",
      targetAmount: 10000,
      currentAmount: 6200,
      accountId: savings.id,
      createdAt: asIsoDate(format(subMonths(now, 5), "yyyy-MM-dd")),
    },
    {
      id: id(),
      name: "Vacation",
      targetAmount: 3000,
      currentAmount: 850,
      deadline: asIsoDate(format(subMonths(now, -6), "yyyy-MM-dd")),
      accountId: savings.id,
      createdAt: asIsoDate(format(subMonths(now, 2), "yyyy-MM-dd")),
    },
  ];

  await db.transaction(
    "rw",
    [db.accounts, db.categories, db.transactions, db.recurringRules, db.goals],
    async () => {
      await db.accounts.bulkAdd([checking, savings, credit]);
      await db.categories.bulkAdd(categories);
      await db.transactions.bulkAdd(txns);
      await db.recurringRules.bulkAdd(rules);
      await db.goals.bulkAdd(goals);
    },
  );
  localStorage.setItem("seeded", "1");
}
