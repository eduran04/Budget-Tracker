import { useMemo } from "react";
import { Pie, PieChart } from "recharts";
import type { Category, Transaction } from "@/types";
import { spentByCategory } from "@/lib/compute";
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
import { EmptyState } from "@/components/shared/EmptyState";
import { ChartPie } from "lucide-react";

export function SpendingDonut({
  categories,
  transactions,
  from,
  to,
}: {
  categories: Category[];
  transactions: Transaction[];
  from: string;
  to: string;
}) {
  const { data, config } = useMemo(() => {
    const spent = spentByCategory(transactions, from, to);
    const entries = categories
      .filter((c) => (spent.get(c.id) ?? 0) > 0)
      .map((c) => ({
        key: c.id,
        name: c.name,
        value: spent.get(c.id)!,
        fill: c.color,
      }))
      .sort((a, b) => b.value - a.value);
    const cfg: ChartConfig = Object.fromEntries(
      entries.map((e) => [e.key, { label: e.name, color: e.fill }]),
    );
    return { data: entries, config: cfg };
  }, [categories, transactions, from, to]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
        <CardDescription>Expenses this month</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={ChartPie}
            title="No spending yet"
            description="Expenses this month will appear here."
          />
        ) : (
          <ChartContainer
            config={config}
            className="mx-auto aspect-square max-h-64"
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="key" hideLabel />}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="key"
                innerRadius={55}
                strokeWidth={2}
              />
              <ChartLegend
                content={<ChartLegendContent nameKey="key" />}
                className="flex-wrap"
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
