import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/lib/compute";

const BAR_COLOR: Record<BudgetStatus["state"], string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  over: "bg-rose-500",
};

/** Progress bar tinted by budget health (green / amber / red). */
export function BudgetProgress({
  status,
  className,
}: {
  status: BudgetStatus;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", BAR_COLOR[status.state])}
        style={{ width: `${Math.min(status.ratio * 100, 100)}%` }}
      />
    </div>
  );
}
