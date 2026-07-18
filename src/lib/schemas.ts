import { z } from "zod";
import { asEntityId, asIsoDate } from "@/types";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

const entityId = z.string().min(1).transform(asEntityId);
const isoDateBranded = isoDate.transform(asIsoDate);

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

// ---------- Persisted entity schemas (backup import) ----------

export const accountEntitySchema = z.object({
  id: entityId,
  name: z.string().min(1),
  type: z.enum(["checking", "savings", "credit", "cash", "other"]),
  color: z.string().min(1),
  startingBalance: z.number(),
  balanceAdjustment: z.number().optional(),
  archived: z.boolean(),
});

export const categoryEntitySchema = z.object({
  id: entityId,
  name: z.string().min(1),
  icon: z.string().min(1),
  color: z.string().min(1),
  monthlyLimit: z.number().positive().optional(),
});

const transactionCommon = {
  id: entityId,
  accountId: entityId,
  amount: z.number(),
  date: isoDateBranded,
  description: z.string(),
  tags: z.array(z.string()).optional(),
  recurringId: entityId.optional(),
};

export const transactionEntitySchema = z.discriminatedUnion("type", [
  z.object({
    ...transactionCommon,
    type: z.literal("income"),
    categoryId: entityId.nullable(),
  }),
  z.object({
    ...transactionCommon,
    type: z.literal("expense"),
    categoryId: entityId.nullable(),
  }),
  z.object({
    ...transactionCommon,
    type: z.literal("transfer"),
    categoryId: z.null(),
    transferPairId: entityId,
  }),
]);

export const recurringRuleEntitySchema = z.object({
  id: entityId,
  accountId: entityId,
  categoryId: entityId,
  amount: z.number(),
  type: z.enum(["income", "expense"]),
  description: z.string(),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  nextDueDate: isoDateBranded,
  autoGenerate: z.boolean(),
});

export const goalEntitySchema = z.object({
  id: entityId,
  name: z.string().min(1),
  targetAmount: z.number(),
  currentAmount: z.number(),
  deadline: isoDateBranded.optional(),
  accountId: entityId.optional(),
  createdAt: isoDateBranded,
});

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  accounts: z.array(accountEntitySchema),
  categories: z.array(categoryEntitySchema),
  transactions: z.array(transactionEntitySchema),
  recurringRules: z.array(recurringRuleEntitySchema),
  goals: z.array(goalEntitySchema),
});

export type ParsedBackup = z.infer<typeof backupSchema>;