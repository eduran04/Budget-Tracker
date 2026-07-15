import type { Account, Category, Transaction } from "@/types";
import { csvRowSchema } from "./schemas";

function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function transactionsToCsv(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
): string {
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const header = "date,description,amount,type,category,account,tags";
  const rows = transactions.map((t) =>
    [
      t.date,
      escapeCell(t.description),
      String(t.amount),
      t.type,
      escapeCell(t.categoryId ? (categoryName.get(t.categoryId) ?? "") : ""),
      escapeCell(accountName.get(t.accountId) ?? ""),
      escapeCell((t.tags ?? []).join(";")),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

/** Minimal CSV parser handling quoted cells and escaped quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export type CsvImportResult = {
  valid: Omit<Transaction, "id">[];
  errors: { line: number; message: string }[];
};

/**
 * Parses a CSV export (or compatible file) into transactions.
 * Expected headers: date, description, amount, type, category, account.
 * Unknown categories/accounts fall back to the provided defaults.
 */
export function csvToTransactions(
  text: string,
  accounts: Account[],
  categories: Category[],
): CsvImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { valid: [], errors: [{ line: 1, message: "File has no data rows" }] };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  if (idx("date") === -1 || idx("amount") === -1) {
    return {
      valid: [],
      errors: [{ line: 1, message: "Missing required columns: date, amount" }],
    };
  }

  const accountByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a]));
  const categoryByName = new Map(
    categories.map((c) => [c.name.toLowerCase(), c]),
  );
  const defaultAccount = accounts[0];

  const valid: Omit<Transaction, "id">[] = [];
  const errors: { line: number; message: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const get = (name: string) => cells[idx(name)]?.trim() ?? "";
    const rawAmount = Number(get("amount"));
    const rawType = get("type").toLowerCase();
    const parsed = csvRowSchema.safeParse({
      date: get("date"),
      description: get("description") || "Imported transaction",
      amount: rawAmount,
      type: rawType || (rawAmount < 0 ? "expense" : "income"),
      category: get("category"),
      account: get("account"),
    });
    if (!parsed.success) {
      errors.push({
        line: i + 1,
        message: parsed.error.issues.map((e) => e.message).join("; "),
      });
      continue;
    }
    const d = parsed.data;
    const account = accountByName.get(d.account.toLowerCase()) ?? defaultAccount;
    if (!account) {
      errors.push({ line: i + 1, message: "No account available" });
      continue;
    }
    const category = categoryByName.get(d.category.toLowerCase());
    const tagsCell = idx("tags") >= 0 ? (cells[idx("tags")]?.trim() ?? "") : "";
    valid.push({
      accountId: account.id,
      categoryId: category?.id ?? null,
      type: d.type,
      amount: Math.abs(d.amount),
      date: d.date,
      description: d.description,
      ...(tagsCell
        ? { tags: tagsCell.split(";").map((t) => t.trim()).filter(Boolean) }
        : {}),
    });
  }
  return { valid, errors };
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
