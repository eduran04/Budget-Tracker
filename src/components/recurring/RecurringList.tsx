import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarClock,
  Check,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { RecurringRule } from "@/types";
import {
  useAccounts,
  useCategories,
  useRecurringRules,
} from "@/hooks/use-live-data";
import { deleteRecurringRule, generateFromRule } from "@/lib/db";
import { formatDisplayDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { CategoryBadge } from "@/components/shared/CategoryBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RecurringForm } from "./RecurringForm";

export function RecurringList() {
  const rules = useRecurringRules();
  const accounts = useAccounts(true);
  const categories = useCategories();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | undefined>();
  const [deleting, setDeleting] = useState<RecurringRule | undefined>();

  const loading = !rules || !accounts || !categories;
  const today = format(new Date(), "yyyy-MM-dd");

  const accountName = useMemo(
    () => new Map((accounts ?? []).map((a) => [a.id, a.name])),
    [accounts],
  );
  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> Add recurring item
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No recurring items"
          description="Add rent, subscriptions, or salary to track upcoming bills."
          actionLabel="Add recurring item"
          onAction={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Next due</TableHead>
                <TableHead className="hidden md:table-cell">Frequency</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => {
                const due = rule.nextDueDate <= today;
                return (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      {rule.description}
                      {rule.autoGenerate && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Auto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={due ? "font-medium text-rose-500" : ""}>
                        {formatDisplayDate(rule.nextDueDate)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden capitalize md:table-cell">
                      {rule.frequency}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <CategoryBadge category={categoryById.get(rule.categoryId)} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {accountName.get(rule.accountId) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <CurrencyDisplay
                        amount={rule.type === "income" ? rule.amount : -rule.amount}
                        colored
                        signed
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={async () => {
                            await generateFromRule(rule, today);
                            toast.success(
                              `${rule.description} recorded as paid`,
                            );
                          }}
                        >
                          <Check className="size-3.5" /> Mark paid
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(rule);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleting(rule)}
                            >
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <RecurringForm
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editing}
        accounts={(accounts ?? []).filter((a) => !a.archived)}
        categories={categories ?? []}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete "${deleting?.description}"?`}
        description="Already-generated transactions are kept; only the recurring rule is removed."
        onConfirm={async () => {
          if (deleting) {
            await deleteRecurringRule(deleting.id);
            toast.success("Recurring item deleted");
            setDeleting(undefined);
          }
        }}
      />
    </>
  );
}
