import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeftRight,
  Landmark,
  MoreVertical,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import type { Account } from "@/types";
import { useAccounts, useTransactions } from "@/hooks/use-live-data";
import { accountBalance } from "@/lib/compute";
import {
  clearBalanceOverride,
  deleteAccount,
  setAccountArchived,
} from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountBalanceDisplay } from "@/components/shared/AccountBalanceDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AccountForm } from "@/components/accounts/AccountForm";
import { TransferForm } from "@/components/accounts/TransferForm";
import { BalanceOverrideDialog } from "@/components/accounts/BalanceOverrideDialog";

const TYPE_LABEL: Record<Account["type"], string> = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit Card",
  cash: "Cash",
  other: "Other",
};

export default function Accounts() {
  const accounts = useAccounts(true);
  const transactions = useTransactions();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | undefined>();
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleting, setDeleting] = useState<Account | undefined>();
  const [overriding, setOverriding] = useState<Account | undefined>();

  const loading = !accounts || !transactions;
  const active = useMemo(
    () => (accounts ?? []).filter((a) => !a.archived),
    [accounts],
  );
  const archived = useMemo(
    () => (accounts ?? []).filter((a) => a.archived),
    [accounts],
  );

  const balance = (a: Account) => accountBalance(a, transactions ?? []);

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Balances are computed from each account's transactions."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setTransferOpen(true)}
              disabled={active.length < 2}
            >
              <ArrowLeftRight className="size-4" />
              Transfer
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add account
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No accounts yet"
          description="Add your first account to start tracking balances."
          actionLabel="Add account"
          onAction={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((account) => (
            <Card key={account.id} className="relative">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  <CardTitle className="text-base">{account.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mt-1.5 size-7">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(account);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setOverriding(account)}
                    >
                      <SlidersHorizontal className="size-4" /> Override balance
                    </DropdownMenuItem>
                    {(account.balanceAdjustment ?? 0) !== 0 && (
                      <DropdownMenuItem
                        onClick={async () => {
                          await clearBalanceOverride(account.id);
                          toast.success("Balance override reset");
                        }}
                      >
                        <Undo2 className="size-4" /> Reset override
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={async () => {
                        await setAccountArchived(account.id, true);
                        toast.success(`${account.name} archived`);
                      }}
                    >
                      <Archive className="size-4" /> Archive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleting(account)}
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <AccountBalanceDisplay
                  account={account}
                  balance={balance(account)}
                  className="text-2xl font-semibold"
                />
                <div className="mt-2 flex gap-1.5">
                  <Badge variant="secondary">{TYPE_LABEL[account.type]}</Badge>
                  {(account.balanceAdjustment ?? 0) !== 0 && (
                    <Badge variant="outline">Adjusted</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Archived
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((account) => (
              <Card key={account.id} className="opacity-60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <CardTitle className="text-base">{account.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await setAccountArchived(account.id, false);
                      toast.success(`${account.name} restored`);
                    }}
                  >
                    <ArchiveRestore className="size-4" /> Restore
                  </Button>
                </CardHeader>
                <CardContent>
                  <AccountBalanceDisplay
                    account={account}
                    balance={balance(account)}
                    className="text-xl font-semibold"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AccountForm open={formOpen} onOpenChange={setFormOpen} account={editing} />
      <BalanceOverrideDialog
        open={!!overriding}
        onOpenChange={(o) => !o && setOverriding(undefined)}
        account={overriding}
        transactions={transactions ?? []}
      />
      <TransferForm
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={active}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete ${deleting?.name}?`}
        description="This permanently deletes the account and all of its transactions. This cannot be undone."
        onConfirm={async () => {
          if (deleting) {
            await deleteAccount(deleting.id);
            toast.success(`${deleting.name} deleted`);
            setDeleting(undefined);
          }
        }}
      />
    </>
  );
}
