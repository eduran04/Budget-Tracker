import { useCurrency } from "@/hooks/use-currency";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function CurrencyDisplay({
  amount,
  colored = false,
  signed = false,
  className,
}: {
  amount: number;
  /** Tint green when positive, red when negative */
  colored?: boolean | undefined;
  /** Prefix positive values with + */
  signed?: boolean | undefined;
  className?: string | undefined;
}) {
  const currency = useCurrency();
  const text =
    (signed && amount > 0 ? "+" : "") + formatCurrency(amount, currency);
  return (
    <span
      className={cn(
        "tabular-nums",
        colored && amount > 0 && "text-income",
        colored && amount < 0 && "text-expense",
        className,
      )}
    >
      {text}
    </span>
  );
}
