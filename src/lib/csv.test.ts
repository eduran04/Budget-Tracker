import { describe, expect, it, vi } from "vitest";
import { csvToTransactions, downloadFile, transactionsToCsv } from "./csv";
import { account, category, transaction } from "@/test/fixtures";

describe("transactionsToCsv", () => {
  it("exports header and rows with resolved names", () => {
    const accounts = [account({ id: "acc-1", name: "Checking" })];
    const categories = [category({ id: "cat-1", name: "Groceries" })];
    const txns = [
      transaction({
        date: "2026-07-01",
        description: "Store",
        amount: 42.5,
        type: "expense",
        accountId: "acc-1",
        categoryId: "cat-1",
      }),
    ];
    const csv = transactionsToCsv(txns, accounts, categories);
    expect(csv).toContain("date,description,amount,type,category,account,tags");
    expect(csv).toContain("2026-07-01,Store,42.5,expense,Groceries,Checking,");
  });

  it("escapes commas and quotes in description", () => {
    const csv = transactionsToCsv(
      [transaction({ description: 'Say "hello", world' })],
      [account()],
      [category()],
    );
    expect(csv).toContain('"Say ""hello"", world"');
  });
});

describe("csvToTransactions", () => {
  const accounts = [
    account({ id: "acc-1", name: "Checking" }),
    account({ id: "acc-2", name: "Savings" }),
  ];
  const categories = [category({ id: "cat-1", name: "Groceries" })];

  it("parses valid rows into transactions", () => {
    const csv = `date,description,amount,type,category,account
2026-07-01,Lunch,25.00,expense,Groceries,Checking`;
    const { valid, errors } = csvToTransactions(csv, accounts, categories);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({
      accountId: "acc-1",
      categoryId: "cat-1",
      type: "expense",
      amount: 25,
      date: "2026-07-01",
      description: "Lunch",
    });
  });

  it("falls back to first account when account name is unknown", () => {
    const csv = `date,description,amount,type,category,account
2026-07-01,Misc,10,expense,,Unknown Account`;
    const { valid } = csvToTransactions(csv, accounts, categories);
    expect(valid[0]?.accountId).toBe("acc-1");
  });

  it("reports errors for invalid dates and zero amounts", () => {
    const csv = `date,description,amount,type,category,account
bad-date,Bad,0,expense,,Checking`;
    const { valid, errors } = csvToTransactions(csv, accounts, categories);
    expect(valid).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error when file has no data rows", () => {
    const { errors } = csvToTransactions("date,amount", accounts, categories);
    expect(errors[0]?.message).toMatch(/no data rows/i);
  });

  it("returns error when required columns are missing", () => {
    const { valid, errors } = csvToTransactions(
      "description,type\nfoo,expense",
      accounts,
      categories,
    );
    expect(valid).toHaveLength(0);
    expect(errors[0]?.message).toMatch(/Missing required columns/i);
  });

  it("reports error when no accounts exist", () => {
    const csv = `date,description,amount,type,category,account
2026-07-01,Lunch,25.00,expense,Groceries,Checking`;
    const { valid, errors } = csvToTransactions(csv, [], categories);
    expect(valid).toHaveLength(0);
    expect(errors[0]?.message).toMatch(/No account available/i);
  });

  it("infers income type from positive amount when type is omitted", () => {
    const csv = `date,description,amount,type,category,account
2026-07-01,Paycheck,500,,,Checking`;
    const { valid, errors } = csvToTransactions(csv, accounts, categories);
    expect(errors).toHaveLength(0);
    expect(valid[0]?.type).toBe("income");
  });

  it("parses semicolon-separated tags", () => {
    const csv = `date,description,amount,type,category,account,tags
2026-07-01,Coffee,5,expense,Groceries,Checking,daily;work`;
    const { valid, errors } = csvToTransactions(csv, accounts, categories);
    expect(errors).toHaveLength(0);
    expect(valid[0]?.tags).toEqual(["daily", "work"]);
  });

  it("round-trips with export", () => {
    const txns = [
      transaction({
        date: "2026-07-10",
        description: "Coffee",
        amount: 5.5,
        type: "expense",
        tags: ["daily"],
      }),
    ];
    const csv = transactionsToCsv(txns, accounts, categories);
    const { valid, errors } = csvToTransactions(csv, accounts, categories);
    expect(errors).toHaveLength(0);
    expect(valid[0]?.amount).toBe(5.5);
    expect(valid[0]?.description).toBe("Coffee");
  });
});

describe("downloadFile", () => {
  it("creates a download link and revokes the object URL", () => {
    const click = vi.fn();
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(document, "createElement").mockReturnValue({
      click,
      href: "",
      download: "",
    } as unknown as HTMLAnchorElement);

    downloadFile("export.csv", "a,b", "text/csv");

    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:test");
  });
});
