import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Account, Category, RecurringRule } from "@/types";
import { recurringSchema, type RecurringFormValues } from "@/lib/schemas";
import { asEntityId, asIsoDate } from "@/types";
import { createRecurringRule, updateRecurringRule } from "@/lib/db";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Switch } from "@/components/ui/switch";

export function RecurringForm({
  open,
  onOpenChange,
  rule,
  accounts,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: RecurringRule | undefined;
  accounts: Account[];
  categories: Category[];
}) {
  const form = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      accountId: "",
      categoryId: "",
      amount: "",
      type: "expense",
      description: "",
      frequency: "monthly",
      nextDueDate: format(new Date(), "yyyy-MM-dd"),
      autoGenerate: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        rule
          ? {
              accountId: rule.accountId,
              categoryId: rule.categoryId,
              amount: String(rule.amount),
              type: rule.type,
              description: rule.description,
              frequency: rule.frequency,
              nextDueDate: rule.nextDueDate,
              autoGenerate: rule.autoGenerate,
            }
          : {
              accountId: accounts[0]?.id ?? "",
              categoryId: "",
              amount: "",
              type: "expense",
              description: "",
              frequency: "monthly",
              nextDueDate: format(new Date(), "yyyy-MM-dd"),
              autoGenerate: false,
            },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule]);

  async function onSubmit(values: RecurringFormValues) {
    const payload = {
      accountId: asEntityId(values.accountId),
      categoryId: asEntityId(values.categoryId),
      amount: Number(values.amount),
      type: values.type,
      description: values.description,
      frequency: values.frequency,
      nextDueDate: asIsoDate(values.nextDueDate),
      autoGenerate: values.autoGenerate,
    };
    if (rule) {
      await updateRecurringRule(rule.id, payload);
      toast.success("Recurring item updated");
    } else {
      await createRecurringRule(payload);
      toast.success("Recurring item created");
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {rule ? "Edit recurring item" : "New recurring item"}
          </SheetTitle>
          <SheetDescription>
            Bills, subscriptions, or salary that repeat on a schedule.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-4"
          >
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Rent" {...field} />
                  </FormControl>
                  <FormMessage />
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
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="nextDueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next due date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                          <SelectValue placeholder="Pick" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
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
                          <SelectValue placeholder="Pick" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
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
              name="autoGenerate"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Auto-generate</FormLabel>
                    <FormDescription>
                      Create the transaction automatically when due.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              {rule ? "Save changes" : "Create recurring item"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
