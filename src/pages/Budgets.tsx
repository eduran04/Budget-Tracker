import { useMemo, useState } from "react";
import {
  ChartPie,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/types";
import { useCategories, useTransactions } from "@/hooks/use-live-data";
import { budgetStatuses, spentByCategory } from "@/lib/compute";
import { monthRange } from "@/lib/dates";
import { deleteCategory } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { getCategoryIcon } from "@/components/shared/icons";
import { CategoryForm } from "@/components/budgets/CategoryForm";
import { BudgetProgress } from "@/components/budgets/BudgetProgress";

export default function Budgets() {
  const categories = useCategories();
  const transactions = useTransactions();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>();
  const [deleting, setDeleting] = useState<Category | undefined>();

  const loading = !categories || !transactions;
  const [from, to] = monthRange(0);

  const statuses = useMemo(
    () => budgetStatuses(categories ?? [], transactions ?? [], from, to),
    [categories, transactions, from, to],
  );
  const statusById = useMemo(
    () => new Map(statuses.map((s) => [s.category.id, s])),
    [statuses],
  );
  const spent = useMemo(
    () => spentByCategory(transactions ?? [], from, to),
    [transactions, from, to],
  );
  const overCount = statuses.filter((s) => s.state === "over").length;

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Spending against monthly limits for the current month."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Add category
          </Button>
        }
      />

      {overCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">
          <TriangleAlert className="size-4 text-rose-500" />
          <span>
            {overCount} {overCount === 1 ? "category is" : "categories are"} over
            budget this month.
          </span>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={ChartPie}
          title="No categories yet"
          description="Create categories to organize spending and set monthly limits."
          actionLabel="Add category"
          onAction={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.icon);
            const status = statusById.get(category.id);
            const spentAmount = spent.get(category.id) ?? 0;
            return (
              <Card key={category.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${category.color}22` }}
                    >
                      <Icon className="size-4" style={{ color: category.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      {status?.state === "over" && (
                        <Badge variant="destructive" className="mt-1">
                          Over budget
                        </Badge>
                      )}
                      {status?.state === "warning" && (
                        <Badge className="mt-1 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          Near limit
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mt-1 size-7">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(category);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleting(category)}
                      >
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {status ? (
                    <>
                      <div className="mb-2 flex items-baseline justify-between text-sm">
                        <span>
                          <CurrencyDisplay
                            amount={status.spent}
                            className="font-semibold"
                          />{" "}
                          <span className="text-muted-foreground">
                            of <CurrencyDisplay amount={status.limit} />
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round(status.ratio * 100)}%
                        </span>
                      </div>
                      <BudgetProgress status={status} />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      <CurrencyDisplay amount={spentAmount} /> spent this month ·
                      no limit set
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CategoryForm open={formOpen} onOpenChange={setFormOpen} category={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete ${deleting?.name}?`}
        description="Transactions in this category will become uncategorized. This cannot be undone."
        onConfirm={async () => {
          if (deleting) {
            await deleteCategory(deleting.id);
            toast.success(`${deleting.name} deleted`);
            setDeleting(undefined);
          }
        }}
      />
    </>
  );
}
