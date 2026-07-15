import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Account, Category, Transaction } from "@/types";
import { transactionSchema, type TransactionFormValues } from "@/lib/schemas";
import { createTransaction, updateTransaction } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCategoryIcon } from "@/components/shared/icons";

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  accounts,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
}) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      accountId: "",
      categoryId: "",
      type: "expense",
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      tags: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        transaction
          ? {
              accountId: transaction.accountId,
              categoryId: transaction.categoryId ?? "",
              type: transaction.type === "income" ? "income" : "expense",
              amount: String(transaction.amount),
              date: transaction.date,
              description: transaction.description,
              tags: (transaction.tags ?? []).join(", "),
            }
          : {
              accountId: accounts[0]?.id ?? "",
              categoryId: "",
              type: "expense",
              amount: "",
              date: format(new Date(), "yyyy-MM-dd"),
              description: "",
              tags: "",
            },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction]);

  async function onSubmit(values: TransactionFormValues) {
    const tags = (values.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      accountId: values.accountId,
      categoryId: values.categoryId,
      type: values.type,
      amount: Number(values.amount),
      date: values.date,
      description: values.description,
      ...(tags.length > 0 ? { tags } : {}),
    };
    if (transaction) {
      await updateTransaction(transaction.id, payload);
      toast.success("Transaction updated");
    } else {
      await createTransaction(payload);
      toast.success("Transaction added");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Edit transaction" : "Add transaction"}
          </DialogTitle>
          <DialogDescription>
            {transaction
              ? "Update the transaction details."
              : "Record income or an expense."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <Tabs value={field.value} onValueChange={field.onChange}>
                    <TabsList className="w-full">
                      <TabsTrigger value="expense" className="flex-1">
                        Expense
                      </TabsTrigger>
                      <TabsTrigger value="income" className="flex-1">
                        Income
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pick a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => {
                          const Icon = getCategoryIcon(c.icon);
                          return (
                            <SelectItem key={c.id} value={c.id}>
                              <Icon
                                className="size-4"
                                style={{ color: c.color }}
                              />
                              {c.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pick an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{ backgroundColor: a.color }}
                            />
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Grocery run" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tags{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional, comma-separated)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. vacation, work" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {transaction ? "Save changes" : "Add transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
