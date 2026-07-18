export const CURRENCIES = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "INR", label: "Indian Rupee (₹)" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const CURRENCY_CODES = new Set<string>(CURRENCIES.map((c) => c.code));

export function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCY_CODES.has(value);
}

export function getCurrency(): CurrencyCode {
  const stored = localStorage.getItem("currency");
  if (stored && isCurrencyCode(stored)) return stored;
  return "USD";
}

export function setCurrency(code: string) {
  if (!isCurrencyCode(code)) return;
  localStorage.setItem("currency", code);
  window.dispatchEvent(new Event("currency-change"));
}

export function formatCurrency(amount: number, currency = getCurrency()) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);
}

/** Compact form for chart axes, e.g. $1.2K */
export function formatCurrencyCompact(
  amount: number,
  currency = getCurrency(),
) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
