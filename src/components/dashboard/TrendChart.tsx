import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { Transaction } from "@/types";
import { totalsForRange } from "@/lib/compute";
import { monthLabel, monthRange } from "@/lib/dates";
import { formatCurrencyCompact } from "@/lib/currency";
import { useCurrency } from "@/hooks/use-currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  income: { label: "Income", color: "var(--income)" },
  expenses: { label: "Expenses", color: "var(--expense)" },
} satisfies ChartConfig;

export function TrendChart({ transactions }: { transactions: Transaction[] }) {
  const currency = useCurrency();
  const data = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const monthsAgo = 5 - i;
        const [from, to] = monthRange(monthsAgo);
        const totals = totalsForRange(transactions, from, to);
        return {
          month: monthLabel(monthsAgo),
          income: totals.income,
          expenses: totals.expenses,
        };
      }),
    [transactions],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs expenses</CardTitle>
        <CardDescription>Last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="max-h-64 w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={54}
              tickFormatter={(v: number) => formatCurrencyCompact(v, currency)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
