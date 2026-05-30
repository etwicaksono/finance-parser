import { describe, it, expect } from "vitest";
import { getCategorySign } from "./category-sign";

describe("getCategorySign", () => {
  it("resolves income categories correctly", () => {
    expect(getCategorySign("Wage, invoices")).toBe("income");
    expect(getCategorySign("wage, invoices")).toBe("income"); // case insensitive
    expect(getCategorySign("Checks, coupons")).toBe("income");
  });

  it("resolves expense categories correctly", () => {
    expect(getCategorySign("Groceries, main meal")).toBe("expense");
    expect(getCategorySign("fuel")).toBe("expense");
    expect(getCategorySign("Taxes")).toBe("expense");
  });

  it("resolves both categories correctly", () => {
    expect(getCategorySign("Missing")).toBe("both");
    expect(getCategorySign("Others")).toBe("both");
  });

  it("returns unknown for unmapped categories", () => {
    expect(getCategorySign("Random Category")).toBe("unknown");
    expect(getCategorySign("")).toBe("unknown");
  });

  it("strips Google Sheets identifiers (::suffix) before resolving", () => {
    expect(getCategorySign("Gifts::73")).toBe("income"); // Gifts is income in taxonomy
    expect(getCategorySign("Wage, invoices::123")).toBe("income"); // Wage, invoices is income
  });
});
