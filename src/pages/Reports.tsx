import { useMemo, useState } from "react";
import { format, subYears } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Lightbulb,
  Minus,
} from "lucide-react";
import { useCategories, useTransactions } from "@/hooks/use-live-data";
import { spentByCategory, totalsForRange } from "@/lib/compute";
import { monthRange, toISODate } from "@/lib/dates";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";
import { useCurrency } from "@/hooks/use-currency";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function ComparisonRow({
  label,
  current,
  previous,
  higherIsGood,
}: {
  label: string;
  current: number;
  previous: number;
  higherIsGood: boolean;
}) {
  const change = pctChange(current, previous);
  const up = change !== null && change > 0;
  const flat = change === null || Math.abs(change) < 0.5;
  const good = flat ? null : up === higherIsGood;
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          <CurrencyDisplay amount={previous} /> →
        </span>
        <CurrencyDisplay amount={current} className="font-semibold" />
        <span
          className={`flex w-20 items-center justify-end gap-0.5 text-sm font-medium ${
            flat
              ? "text-muted-foreground"
              : good
                ? "text-income"
                : "text-expense"
          }`}
        >
          {flat ? (
            <Minus className="size-3.5" />
          ) : up ? (
            <ArrowUpRight className="size-3.5" />
          ) : (
            <ArrowDownRight className="size-3.5" />
          )}
          {change === null ? "—" : `${Math.abs(change).toFixed(0)}%`}
        </span>
      </div>
    </div>
  );
}

const RANGE_OPTIONS = [
  { value: "1", label: "This month" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
] as const;

export default function Reports() {
  const categories = useCategories();
  const transactions = useTransactions();
  const currency = useCurrency();
  const [rangeMonths, setRangeMonths] = useState("3");

  const loading = !categories || !transactions;

  // Month-over-month
  const [curFrom, curTo] = monthRange(0);
  const [prevFrom, prevTo] = monthRange(1);
  const current = useMemo(
    () => totalsForRange(transactions ?? [], curFrom, curTo),
    [transactions, curFrom, curTo],
  );
  const previous = useMemo(
    () => totalsForRange(transactions ?? [], prevFrom, prevTo),
    [transactions, prevFrom, prevTo],
  );

  // Year-over-year (same month last year)
  const yoyFrom = toISODate(subYears(new Date(`${curFrom}T00:00:00`), 1));
  const yoyTo = toISODate(subYears(new Date(`${curTo}T00:00:00`), 1));
  const lastYear = useMemo(
    () => totalsForRange(transactions ?? [], yoyFrom, yoyTo),
    [transactions, yoyFrom, yoyTo],
  );

  // Top categories over the selected range
  const topCategories = useMemo(() => {
    const [from] = monthRange(Number(rangeMonths) - 1);
    const [, to] = monthRange(0);
    const spent = spentByCategory(transactions ?? [], from, to);
    return (categories ?? [])
      .filter((c) => (spent.get(c.id) ?? 0) > 0)
      .map((c) => ({ name: c.name, total: spent.get(c.id)!, fill: c.color }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [categories, transactions, rangeMonths]);

  const chartConfig = { total: { label: "Spent" } } satisfies ChartConfig;

  // Plain-language insights from month-over-month category comparison
  const insights = useMemo(() => {
    if (!categories || !transactions) return [];
    const out: string[] = [];
    const curSpent = spentByCategory(transactions, curFrom, curTo);
    const prevSpent = spentByCategory(transactions, prevFrom, prevTo);

    for (const c of categories) {
      const cur = curSpent.get(c.id) ?? 0;
      const prev = prevSpent.get(c.id) ?? 0;
      if (prev < 20 || cur < 20) continue; // skip noise
      const change = pctChange(cur, prev);
      if (change !== null && Math.abs(change) >= 15) {
        out.push(
          `${c.name} spending is ${Math.abs(change).toFixed(0)}% ${
            change > 0 ? "higher" : "lower"
          } than last month (${formatCurrency(prev, currency)} → ${formatCurrency(cur, currency)}).`,
        );
      }
    }
    const netChange = current.net - previous.net;
    if (Math.abs(netChange) >= 50) {
      out.push(
        netChange > 0
          ? `You saved ${formatCurrency(netChange, currency)} more than last month. Nice work!`
          : `You saved ${formatCurrency(Math.abs(netChange), currency)} less than last month.`,
      );
    }
    if (current.expenses > current.income && current.income > 0) {
      out.push(
        `Spending exceeds income this month by ${formatCurrency(current.expenses - current.income, currency)}.`,
      );
    }
    return out.slice(0, 5);
  }, [categories, transactions, curFrom, curTo, prevFrom, prevTo, current, previous, currency]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Trends, comparisons, and insights."
      />

      {insights.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-500" /> Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((text, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                  {text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comparisons</CardTitle>
            <CardDescription>
              {format(new Date(), "MMMM yyyy")} vs prior periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="mom">
              <TabsList>
                <TabsTrigger value="mom">Month over month</TabsTrigger>
                <TabsTrigger value="yoy">Year over year</TabsTrigger>
              </TabsList>
              <TabsContent value="mom" className="divide-y">
                <ComparisonRow
                  label="Income"
                  current={current.income}
                  previous={previous.income}
                  higherIsGood
                />
                <ComparisonRow
                  label="Expenses"
                  current={current.expenses}
                  previous={previous.expenses}
                  higherIsGood={false}
                />
                <ComparisonRow
                  label="Net savings"
                  current={current.net}
                  previous={previous.net}
                  higherIsGood
                />
              </TabsContent>
              <TabsContent value="yoy" className="divide-y">
                <ComparisonRow
                  label="Income"
                  current={current.income}
                  previous={lastYear.income}
                  higherIsGood
                />
                <ComparisonRow
                  label="Expenses"
                  current={current.expenses}
                  previous={lastYear.expenses}
                  higherIsGood={false}
                />
                <ComparisonRow
                  label="Net savings"
                  current={current.net}
                  previous={lastYear.net}
                  higherIsGood
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top spending categories</CardTitle>
              <CardDescription>Where the money went</CardDescription>
            </div>
            <Select value={rangeMonths} onValueChange={setRangeMonths}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No expenses in this period.
              </p>
            ) : (
              <ChartContainer
                config={chartConfig}
                className="w-full"
                style={{ height: Math.max(topCategories.length * 40, 160) }}
              >
                <BarChart data={topCategories} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      formatCurrencyCompact(v, currency)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel nameKey="total" />}
                  />
                  <Bar dataKey="total" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
