import { useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  Download,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { EntityId, Transaction } from "@/types";
import {
  useAccounts,
  useCategories,
  useTransactions,
} from "@/hooks/use-live-data";
import {
  bulkSetCategory,
  createTransaction,
  deleteTransactions,
} from "@/lib/db";
import { csvToTransactions, downloadFile, transactionsToCsv } from "@/lib/csv";
import { formatDisplayDate } from "@/lib/dates";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { CategoryBadge } from "@/components/shared/CategoryBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { RecurringList } from "@/components/recurring/RecurringList";

const SORT_KEYS = [
  "date-desc",
  "date-asc",
  "amount-desc",
  "amount-asc",
] as const;
type SortKey = (typeof SORT_KEYS)[number];

function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

const ALL = "__all__";

export default function Transactions() {
  const accounts = useAccounts(true);
  const categories = useCategories();
  const transactions = useTransactions();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [accountFilter, setAccountFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [selected, setSelected] = useState<Set<EntityId>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deletingSingle, setDeletingSingle] = useState<Transaction | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = !accounts || !categories || !transactions;

  const accountName = useMemo(
    () => new Map((accounts ?? []).map((a) => [a.id, a.name])),
    [accounts],
  );
  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  const filtered = useMemo(() => {
    let list = transactions ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    if (categoryFilter !== ALL)
      list = list.filter((t) => t.categoryId === categoryFilter);
    if (accountFilter !== ALL)
      list = list.filter((t) => t.accountId === accountFilter);
    if (typeFilter !== ALL) list = list.filter((t) => t.type === typeFilter);
    if (dateFrom) list = list.filter((t) => t.date >= dateFrom);
    if (dateTo) list = list.filter((t) => t.date <= dateTo);

    return [...list].sort((a, b) => {
      switch (sort) {
        case "date-asc":
          return a.date.localeCompare(b.date);
        case "amount-desc":
          return Math.abs(b.amount) - Math.abs(a.amount);
        case "amount-asc":
          return Math.abs(a.amount) - Math.abs(b.amount);
        default:
          return b.date.localeCompare(a.date);
      }
    });
  }, [transactions, search, categoryFilter, accountFilter, typeFilter, dateFrom, dateTo, sort]);

  const hasFilters =
    search !== "" ||
    categoryFilter !== ALL ||
    accountFilter !== ALL ||
    typeFilter !== ALL ||
    dateFrom !== "" ||
    dateTo !== "";

  function clearFilters() {
    setSearch("");
    setCategoryFilter(ALL);
    setAccountFilter(ALL);
    setTypeFilter(ALL);
    setDateFrom("");
    setDateTo("");
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(filtered.map((t) => t.id)) : new Set());
  }

  function toggleOne(id: EntityId, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function exportCsv() {
    const csv = transactionsToCsv(filtered, accounts ?? [], categories ?? []);
    downloadFile("transactions.csv", csv, "text/csv");
    toast.success(`Exported ${filtered.length} transactions`);
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const { valid, errors } = csvToTransactions(
      text,
      (accounts ?? []).filter((a) => !a.archived),
      categories ?? [],
    );
    for (const txn of valid) await createTransaction(txn);
    if (valid.length > 0) toast.success(`Imported ${valid.length} transactions`);
    if (errors.length > 0)
      toast.error(
        `Skipped ${errors.length} row(s): ${errors
          .slice(0, 3)
          .map((e) => `line ${e.line} (${e.message})`)
          .join(", ")}${errors.length > 3 ? "…" : ""}`,
      );
  }

  const displayAmount = (t: Transaction) =>
    t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : t.amount;

  return (
    <>
      <PageHeader
        title="Transactions"
        description={
          loading ? undefined : `${filtered.length} of ${transactions.length} transactions`
        }
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importCsv(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" /> Import
            </Button>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={loading || filtered.length === 0}
            >
              <Download className="size-4" /> Export
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Add
            </Button>
          </>
        }
      />

      <Tabs defaultValue="all">
        <TabsList className="mb-3">
          <TabsTrigger value="all">All transactions</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search description or tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All accounts</SelectItem>
            {(accounts ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
            aria-label="From date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
            aria-label="To date"
          />
        </div>
        <Select
          value={sort}
          onValueChange={(v) => {
            if (isSortKey(v)) setSort(v);
          }}
        >
          <SelectTrigger className="w-40">
            <ArrowDownUp className="size-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest first</SelectItem>
            <SelectItem value="date-asc">Oldest first</SelectItem>
            <SelectItem value="amount-desc">Largest amount</SelectItem>
            <SelectItem value="amount-asc">Smallest amount</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-4" /> Clear
          </Button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Set category
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Reassign to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(categories ?? []).map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={async () => {
                      await bulkSetCategory([...selected], c.id);
                      toast.success(
                        `Moved ${selected.size} transaction(s) to ${c.name}`,
                      );
                      setSelected(new Set());
                    }}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmBulkDelete(true)}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={hasFilters ? "No matching transactions" : "No transactions yet"}
          description={
            hasFilters
              ? "Try adjusting or clearing the filters."
              : "Add your first transaction to get started."
          }
          actionLabel={hasFilters ? "Clear filters" : "Add transaction"}
          onAction={
            hasFilters
              ? clearFilters
              : () => {
                  setEditing(undefined);
                  setFormOpen(true);
                }
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      selected.size > 0 && selected.size === filtered.length
                    }
                    onCheckedChange={(c) => toggleAll(c === true)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(t.id)}
                      onCheckedChange={(c) => toggleOne(t.id, c === true)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDisplayDate(t.date)}
                  </TableCell>
                  <TableCell className="max-w-56">
                    <div className="truncate font-medium">{t.description}</div>
                    {(t.tags ?? []).length > 0 && (
                      <div className="mt-0.5 flex gap-1">
                        {t.tags!.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <CategoryBadge
                      category={t.categoryId ? categoryById.get(t.categoryId) : null}
                    />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {accountName.get(t.accountId) ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <CurrencyDisplay amount={displayAmount(t)} colored signed />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      {t.type !== "transfer" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label="Edit"
                          onClick={() => {
                            setEditing(t);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                        onClick={() => setDeletingSingle(t)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
        </TabsContent>
        <TabsContent value="recurring">
          <RecurringList />
        </TabsContent>
      </Tabs>

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        accounts={(accounts ?? []).filter((a) => !a.archived)}
        categories={categories ?? []}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`Delete ${selected.size} transaction(s)?`}
        description="Deleting a transfer also removes its paired entry. This cannot be undone."
        onConfirm={async () => {
          await deleteTransactions([...selected]);
          toast.success(`Deleted ${selected.size} transaction(s)`);
          setSelected(new Set());
          setConfirmBulkDelete(false);
        }}
      />
      <ConfirmDialog
        open={!!deletingSingle}
        onOpenChange={(o) => !o && setDeletingSingle(undefined)}
        title="Delete this transaction?"
        description={
          deletingSingle?.type === "transfer"
            ? "This is one side of a transfer; its paired entry will be deleted too."
            : "This cannot be undone."
        }
        onConfirm={async () => {
          if (deletingSingle) {
            await deleteTransactions([deletingSingle.id]);
            toast.success("Transaction deleted");
            setDeletingSingle(undefined);
          }
        }}
      />
    </>
  );
}
