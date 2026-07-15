import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

/** Form inputs keep numbers as strings; convert with Number() on submit. */
const positiveAmount = z
  .string()
  .min(1, "Enter an amount")
  .refine((v) => Number(v) > 0, "Amount must be greater than 0");

const anyNumber = z
  .string()
  .min(1, "Enter a number")
  .refine((v) => !Number.isNaN(Number(v)), "Enter a valid number");

export const transactionSchema = z.object({
  accountId: z.string().min(1, "Pick an account"),
  categoryId: z.string().min(1, "Pick a category"),
  type: z.enum(["income", "expense"]),
  amount: positiveAmount,
  date: isoDate,
  description: z.string().min(1, "Add a description"),
  tags: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, "Pick an account"),
    toAccountId: z.string().min(1, "Pick an account"),
    amount: positiveAmount,
    date: isoDate,
    description: z.string().min(1, "Add a description"),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: "Accounts must be different",
    path: ["toAccountId"],
  });

export type TransferFormValues = z.infer<typeof transferSchema>;

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["checking", "savings", "credit", "cash", "other"]),
  color: z.string().min(1),
  startingBalance: anyNumber,
});

export type AccountFormValues = z.infer<typeof accountSchema>;

export const balanceOverrideSchema = z.object({ balance: anyNumber });

export type BalanceOverrideFormValues = z.infer<typeof balanceOverrideSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().min(1),
  color: z.string().min(1),
  monthlyLimit: z
    .string()
    .optional()
    .refine(
      (v) => !v || Number(v) > 0,
      "Limit must be greater than 0",
    ),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const recurringSchema = z.object({
  accountId: z.string().min(1, "Pick an account"),
  categoryId: z.string().min(1, "Pick a category"),
  amount: positiveAmount,
  type: z.enum(["income", "expense"]),
  description: z.string().min(1, "Add a description"),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  nextDueDate: isoDate,
  autoGenerate: z.boolean(),
});

export type RecurringFormValues = z.infer<typeof recurringSchema>;

export const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: positiveAmount,
  deadline: z.union([isoDate, z.literal("")]).optional(),
  accountId: z.string().optional(),
});

export type GoalFormValues = z.infer<typeof goalSchema>;

/** One row of an imported CSV file (amount already parsed to number). */
export const csvRowSchema = z.object({
  date: isoDate,
  description: z.string().min(1),
  amount: z.number().refine((n) => n !== 0, "Amount cannot be 0"),
  type: z.enum(["income", "expense"]),
  category: z.string().optional().default(""),
  account: z.string().optional().default(""),
});

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  accounts: z.array(z.record(z.string(), z.unknown())),
  categories: z.array(z.record(z.string(), z.unknown())),
  transactions: z.array(z.record(z.string(), z.unknown())),
  recurringRules: z.array(z.record(z.string(), z.unknown())),
  goals: z.array(z.record(z.string(), z.unknown())),
});
