import type { Account } from "@/types";
import { creditAmountOwed, type CreditDisplayMode } from "@/lib/compute";
import { formatCurrency } from "@/lib/currency";
import { useCurrency } from "@/hooks/use-currency";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { cn } from "@/lib/utils";

/** Default credit display — change to try other modes listed in the Accounts UI docs. */
export const CREDIT_DISPLAY_MODE: CreditDisplayMode = "label-above";

export function AccountBalanceDisplay({
  account,
  balance,
  className,
  creditMode = CREDIT_DISPLAY_MODE,
}: {
  account: Account;
  balance: number;
  className?: string | undefined;
  creditMode?: CreditDisplayMode | undefined;
}) {
  const currency = useCurrency();

  if (account.type !== "credit") {
    return (
      <CurrencyDisplay amount={balance} className={className} />
    );
  }

  const owed = creditAmountOwed(balance);
  const liabilityClass = cn("text-expense tabular-nums", className);

  if (creditMode === "signed-negative") {
    return (
      <CurrencyDisplay
        amount={-owed}
        colored
        className={className}
      />
    );
  }

  if (creditMode === "owed-suffix") {
    return (
      <span className={liabilityClass}>
        {formatCurrency(owed, currency)} owed
      </span>
    );
  }

  if (creditMode === "parentheses") {
    return (
      <span className={liabilityClass}>
        ({formatCurrency(owed, currency)})
      </span>
    );
  }

  // label-above
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">Balance owed</p>
      <span className={cn("font-semibold", liabilityClass, className)}>
        {formatCurrency(owed, currency)}
      </span>
    </div>
  );
}
