import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

// useLiveQuery re-renders automatically after any Dexie write,
// so the UI reflects changes instantly without manual cache invalidation.

export function useAccounts(includeArchived = false) {
  return useLiveQuery(async () => {
    const all = await db.accounts.toArray();
    return includeArchived ? all : all.filter((a) => !a.archived);
  }, [includeArchived]);
}

export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy("name").toArray(), []);
}

export function useTransactions() {
  return useLiveQuery(
    () => db.transactions.orderBy("date").reverse().toArray(),
    [],
  );
}

export function useRecurringRules() {
  return useLiveQuery(
    () => db.recurringRules.orderBy("nextDueDate").toArray(),
    [],
  );
}

export function useGoals() {
  return useLiveQuery(() => db.goals.toArray(), []);
}
