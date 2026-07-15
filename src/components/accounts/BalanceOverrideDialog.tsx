import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Account, Transaction } from "@/types";
import {
  balanceOverrideSchema,
  type BalanceOverrideFormValues,
} from "@/lib/schemas";
import { accountBalance, creditAmountOwed } from "@/lib/compute";
import { overrideAccountBalance } from "@/lib/db";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function BalanceOverrideDialog({
  open,
  onOpenChange,
  account,
  transactions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  transactions: Transaction[];
}) {
  const form = useForm<BalanceOverrideFormValues>({
    resolver: zodResolver(balanceOverrideSchema),
    defaultValues: { balance: "0" },
  });

  useEffect(() => {
    if (open && account) {
      const current = accountBalance(account, transactions);
      form.reset({
        balance:
          account.type === "credit"
            ? String(creditAmountOwed(current))
            : String(current),
      });
    }
  }, [open, account, transactions, form]);

  const isCredit = account?.type === "credit";

  async function onSubmit(values: BalanceOverrideFormValues) {
    if (!account) return;
    const raw = Number(values.balance);
    const target = isCredit ? -Math.abs(raw) : raw;
    await overrideAccountBalance(account, transactions, target);
    toast.success("Balance overridden");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Override balance</DialogTitle>
          <DialogDescription>
            {account
              ? `Set the balance shown for ${account.name}.`
              : "Set the balance shown for this account."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isCredit ? "Current amount owed" : "New balance"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={isCredit ? "0" : undefined}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This updates the balance shown for this account without
                    changing any transactions.
                  </FormDescription>
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
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
