import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  PiggyBank,
  Plus,
  Receipt,
  Wallet,
} from "lucide-react";
import { addDays, format } from "date-fns";
import {
  useAccounts,
  useCategories,
  useRecurringRules,
  useTransactions,
} from "@/hooks/use-live-data";
import {
  accountBalance,
  budgetStatuses,
  totalsForRange,
} from "@/lib/compute";
import { formatDisplayDate, monthRange } from "@/lib/dates";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { CategoryBadge } from "@/components/shared/CategoryBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { BudgetProgress } from "@/components/budgets/BudgetProgress";
import { SpendingDonut } from "@/components/dashboard/SpendingDonut";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default function Dashboard() {
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const rules = useRecurringRules();
  const [addOpen, setAddOpen] = useState(false);

  const loading = !accounts || !categories || !transactions || !rules;
  const [from, to] = monthRange(0);

  const totalBalance = useMemo(
    () =>
      (accounts ?? []).reduce(
        (sum, a) => sum + accountBalance(a, transactions ?? []),
        0,
      ),
    [accounts, transactions],
  );
  const totals = useMemo(
    () => totalsForRange(transactions ?? [], from, to),
    [transactions, from, to],
  );
  const recent = useMemo(
    () => (transactions ?? []).slice(0, 8),
    [transactions],
  );
  const health = useMemo(
    () =>
      budgetStatuses(categories ?? [], transactions ?? [], from, to).slice(0, 5),
    [categories, transactions, from, to],
  );
  const upcoming = useMemo(() => {
    const horizon = format(addDays(new Date(), 14), "yyyy-MM-dd");
    return (rules ?? [])
      .filter((r) => r.nextDueDate <= horizon)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
      .slice(0, 5);
  }, [rules]);

  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const summary = [
    {
      label: "Total balance",
      icon: Wallet,
      value: totalBalance,
      colored: false,
    },
    {
      label: "Income this month",
      icon: ArrowUpRight,
      value: totals.income,
      accent: "text-income",
    },
    {
      label: "Expenses this month",
      icon: ArrowDownRight,
      value: totals.expenses,
      accent: "text-expense",
    },
    {
      label: "Net savings",
      icon: PiggyBank,
      value: totals.net,
      accent: totals.net >= 0 ? "text-income" : "text-expense",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={format(new Date(), "EEEE, MMMM d")}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add transaction
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label} className="gap-2">
            <CardHeader className="pb-0">
              <CardDescription className="flex items-center gap-1.5">
                <s.icon className="size-3.5" />
                {s.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CurrencyDisplay
                amount={s.value}
                className={`text-2xl font-semibold ${s.accent ?? ""}`}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SpendingDonut
            categories={categories}
            transactions={transactions}
            from={from}
            to={to}
          />
        </div>
        <div className="lg:col-span-3">
          <TrendChart transactions={transactions} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent transactions</CardTitle>
              <CardDescription>Latest activity across accounts</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/transactions">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No transactions yet"
                description="Add a transaction to see it here."
              />
            ) : (
              <div className="divide-y">
                {recent.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDisplayDate(t.date)}
                      </p>
                    </div>
                    <CategoryBadge
                      category={t.categoryId ? categoryById.get(t.categoryId) : null}
                    />
                    <CurrencyDisplay
                      amount={
                        t.type === "income"
                          ? t.amount
                          : t.type === "expense"
                            ? -t.amount
                            : t.amount
                      }
                      colored
                      signed
                      className="text-sm font-medium"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Budget health</CardTitle>
                <CardDescription>Closest to their limits</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/budgets">Manage</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {health.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Set monthly limits on categories to track budget health.
                </p>
              ) : (
                health.map((s) => (
                  <div key={s.category.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-medium">
                        {s.category.name}
                        {s.state === "over" && (
                          <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                            Over
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <CurrencyDisplay amount={s.spent} /> /{" "}
                        <CurrencyDisplay amount={s.limit} />
                      </span>
                    </div>
                    <BudgetProgress status={s} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming bills</CardTitle>
              <CardDescription>Due in the next 14 days</CardDescription>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing due soon.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {upcoming.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <CalendarClock className="size-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDisplayDate(r.nextDueDate)}
                        </p>
                      </div>
                      <CurrencyDisplay
                        amount={r.type === "income" ? r.amount : -r.amount}
                        colored
                        className="font-medium"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TransactionForm
        open={addOpen}
        onOpenChange={setAddOpen}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
}
