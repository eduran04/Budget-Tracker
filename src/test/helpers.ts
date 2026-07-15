import { db } from "@/lib/db";

/** Wipes all tables between tests. Keeps the Dexie schema intact. */
export async function clearDb() {
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
