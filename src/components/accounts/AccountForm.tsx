import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Account } from "@/types";
import { accountSchema, type AccountFormValues } from "@/lib/schemas";
import { createAccount, updateAccount } from "@/lib/db";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_COLORS,
  DEFAULT_ACCOUNT_COLOR,
} from "@/components/shared/icons";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
] as const;

export function AccountForm({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | undefined;
}) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "checking",
      color: DEFAULT_ACCOUNT_COLOR,
      startingBalance: "0",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        account
          ? {
              name: account.name,
              type: account.type,
              color: account.color,
              startingBalance:
                account.type === "credit"
                  ? String(Math.abs(account.startingBalance))
                  : String(account.startingBalance),
            }
          : {
              name: "",
              type: "checking",
              color: DEFAULT_ACCOUNT_COLOR,
              startingBalance: "0",
            },
      );
    }
  }, [open, account, form]);

  const accountType = form.watch("type");

  async function onSubmit(values: AccountFormValues) {
    const raw = Number(values.startingBalance);
    const payload = {
      name: values.name,
      type: values.type,
      color: values.color,
      startingBalance:
        values.type === "credit" ? -Math.abs(raw) : raw,
    };
    if (account) {
      await updateAccount(account.id, payload);
      toast.success("Account updated");
    } else {
      await createAccount({ ...payload, archived: false });
      toast.success("Account created");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Update the account details."
              : "Add an account to track its balance and transactions."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Checking" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
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
              name="startingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {accountType === "credit"
                      ? "Current balance owed"
                      : "Starting balance"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={accountType === "credit" ? "0" : undefined}
                      {...field}
                    />
                  </FormControl>
                  {accountType === "credit" && (
                    <FormDescription>
                      Enter how much you owe. Purchases increase this balance;
                      payments from another account decrease it.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Color ${c}`}
                          onClick={() => field.onChange(c)}
                          className={cn(
                            "size-7 rounded-full border-2 transition-transform",
                            field.value === c
                              ? "scale-110 border-foreground"
                              : "border-transparent",
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
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
              <Button type="submit">{account ? "Save" : "Create"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
