import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

export const parseISODate = (s: string) => new Date(`${s}T00:00:00`);

/** [first, last] ISO dates of the month `monthsAgo` months before now. */
export function monthRange(monthsAgo = 0): [string, string] {
  const base = subMonths(new Date(), monthsAgo);
  return [toISODate(startOfMonth(base)), toISODate(endOfMonth(base))];
}

export function monthLabel(monthsAgo = 0): string {
  return format(subMonths(new Date(), monthsAgo), "MMM");
}

export function formatDisplayDate(iso: string): string {
  return format(parseISODate(iso), "MMM d, yyyy");
}
