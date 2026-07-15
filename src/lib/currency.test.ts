import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyCompact,
  getCurrency,
  setCurrency,
} from "./currency";

describe("currency", () => {
  it("defaults to USD when localStorage is empty", () => {
    expect(getCurrency()).toBe("USD");
  });

  it("persists currency selection", () => {
    setCurrency("EUR");
    expect(getCurrency()).toBe("EUR");
    expect(localStorage.getItem("currency")).toBe("EUR");
  });

  it("formats amounts with Intl", () => {
    const formatted = formatCurrency(1234.56, "USD");
    expect(formatted).toMatch(/1,234\.56/);
    expect(formatted).toMatch(/\$/);
  });

  it("formats compact notation for chart axes", () => {
    const formatted = formatCurrencyCompact(1500, "USD");
    expect(formatted.length).toBeLessThan(10);
  });
});
