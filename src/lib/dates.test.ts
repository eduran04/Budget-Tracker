import { describe, expect, it } from "vitest";
import {
  formatDisplayDate,
  monthLabel,
  monthRange,
  parseISODate,
  toISODate,
} from "./dates";

describe("dates", () => {
  it("converts Date to ISO date string", () => {
    expect(toISODate(new Date("2026-07-15T12:00:00"))).toBe("2026-07-15");
  });

  it("parses ISO date at local midnight", () => {
    const d = parseISODate("2026-07-15");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(15);
  });

  it("returns first and last day of a month range", () => {
    const [from, to] = monthRange(0);
    expect(from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(to >= from).toBe(true);
  });

  it("formats display dates for the UI", () => {
    expect(formatDisplayDate("2026-07-15")).toBe("Jul 15, 2026");
  });

  it("returns three-letter month labels", () => {
    expect(monthLabel(0)).toMatch(/^[A-Z][a-z]{2}$/);
  });
});
