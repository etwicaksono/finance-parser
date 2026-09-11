import { describe, it, expect, vi } from "vitest";
import { TransactionRow, CategoryOption } from "@/types";
import { applyColumnUpdate, type ColumnHandlerContext } from "./column-handlers";

const categories: CategoryOption[] = [
  { id: "c-income", name: "Gaji", signType: "income" },
  { id: "c-expense", name: "Makanan", signType: "expense" },
  { id: "c-both", name: "Transfer", signType: "both" },
  // Kategori lama tanpa signType → fallback "both" (amount tidak disentuh)
  { id: "c-legacy", name: "Legacy" },
];

function makeRow(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: "r1",
    date: "2026-09-11",
    item: "Nasi Goreng",
    amount: -25000,
    categoryId: null,
    accountId: null,
    labelIds: [],
    notes: "",
    ...overrides,
  };
}

function makeCtx(overrides: Partial<ColumnHandlerContext> = {}): ColumnHandlerContext {
  return {
    categories,
    accounts: [],
    labels: [],
    contraKeywords: [],
    keywordMappings: [],
    ...overrides,
  };
}

describe("category column change adjusts amount sign from category.signType", () => {
  it("forces a positive amount for income categories", () => {
    const row = makeRow({ amount: -25000 });
    applyColumnUpdate(row, "categoryId", "Gaji", makeCtx());
    expect(row.categoryId).toBe("c-income");
    expect(row.amount).toBe(25000);
  });

  it("keeps an already positive amount for income categories", () => {
    const row = makeRow({ amount: 25000 });
    applyColumnUpdate(row, "categoryId", "Gaji", makeCtx());
    expect(row.amount).toBe(25000);
  });

  it("forces a negative amount for expense categories", () => {
    const row = makeRow({ amount: 25000 });
    applyColumnUpdate(row, "categoryId", "Makanan", makeCtx());
    expect(row.categoryId).toBe("c-expense");
    expect(row.amount).toBe(-25000);
  });

  it("leaves the amount untouched for 'both' categories", () => {
    const row = makeRow({ amount: -25000 });
    applyColumnUpdate(row, "categoryId", "Transfer", makeCtx());
    expect(row.amount).toBe(-25000);
  });

  it("keeps a positive amount for a contra item under an expense category", () => {
    const row = makeRow({ item: "Refund Shopee", amount: 50000 });
    applyColumnUpdate(row, "categoryId", "Makanan", makeCtx({ contraKeywords: ["refund"] }));
    expect(row.amount).toBe(50000);
  });

  it("forces a negative amount for a contra item that is already negative", () => {
    const row = makeRow({ item: "Refund Shopee", amount: -50000 });
    applyColumnUpdate(row, "categoryId", "Makanan", makeCtx({ contraKeywords: ["refund"] }));
    expect(row.amount).toBe(-50000);
  });

  it("leaves the amount untouched when the category has no signType", () => {
    const row = makeRow({ amount: -25000 });
    applyColumnUpdate(row, "categoryId", "Legacy", makeCtx());
    expect(row.amount).toBe(-25000);
  });

  it("does not touch the amount when the category is not found", () => {
    const row = makeRow({ amount: -25000 });
    applyColumnUpdate(row, "categoryId", "Tidak Ada", makeCtx());
    expect(row.categoryId).toBeNull();
    expect(row.amount).toBe(-25000);
  });

  it("notifies onCategoryChange once when the category actually changes", () => {
    const onCategoryChange = vi.fn();
    const row = makeRow({ amount: -25000 });
    applyColumnUpdate(row, "categoryId", "Makanan", makeCtx({ onCategoryChange }));
    expect(onCategoryChange).toHaveBeenCalledTimes(1);
    expect(onCategoryChange).toHaveBeenCalledWith("r1", "Nasi Goreng", "c-expense");
  });

  it("does not notify onCategoryChange when the category is unchanged", () => {
    const onCategoryChange = vi.fn();
    const row = makeRow({ categoryId: "c-expense", amount: -25000 });
    applyColumnUpdate(row, "categoryId", "Makanan", makeCtx({ onCategoryChange }));
    expect(onCategoryChange).not.toHaveBeenCalled();
  });
});
