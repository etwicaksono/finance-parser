import { describe, it, expect } from "vitest";
import { TransactionRow } from "@/types";
import { formatRowsForSheets, sanitizeTsvCell } from "./sheet-copy";

const labels = [
  { id: "l-food", name: "Food" },
  { id: "l-house", name: "Household" },
  { id: "l-bills", name: "Bills" },
];

const categories = [
  { id: "c-food", name: "Makanan" },
  { id: "c-transport", name: "Transport" },
];

const accounts = [
  { id: "a-bca", name: "BCA" },
  { id: "a-cash", name: "Cash" },
];

function row(overrides: Partial<TransactionRow> & { id: string }): TransactionRow {
  return {
    date: "2026-05-16",
    item: "Semangka",
    amount: -20000,
    categoryId: "c-food",
    accountId: "a-bca",
    labelIds: [],
    notes: "",
    ...overrides,
  };
}

describe("formatRowsForSheets (Copy All/Selected Rows)", () => {
  it("outputs the Google Sheets column order with the empty placeholder", () => {
    const tsv = formatRowsForSheets([row({ id: "1" })], {
      labels,
      categories,
      accounts,
      includeHeader: true,
    });

    const lines = tsv.split("\n");
    expect(lines[0]).toBe("Date\tAccount\tCategory\tAmount\tItem\t\tLabels");
    expect(lines[1]).toBe("2026-05-16\tBCA\tMakanan\t-20000\tSemangka\t\t");
  });

  it("joins label names comma-separated in the final Labels column", () => {
    const tsv = formatRowsForSheets(
      [row({ id: "1", labelIds: ["l-food", "l-house"] })],
      { labels, categories, accounts, includeHeader: false },
    );

    expect(tsv).toBe("2026-05-16\tBCA\tMakanan\t-20000\tSemangka\t\tFood, Household");
  });

  it("keeps label order stable regardless of id order in the row", () => {
    const tsv = formatRowsForSheets(
      [row({ id: "1", labelIds: ["l-house", "l-food"] })],
      { labels, categories, accounts, includeHeader: false },
    );

    expect(tsv.endsWith("\tHousehold, Food")).toBe(true);
  });

  it("leaves the Labels cell empty when the row has no labels", () => {
    const tsv = formatRowsForSheets([row({ id: "1", labelIds: [] })], {
      labels,
      categories,
      accounts,
      includeHeader: false,
    });

    expect(tsv.endsWith("\t\t")).toBe(true);
  });

  it("drops label ids that are not in the label list", () => {
    const tsv = formatRowsForSheets(
      [row({ id: "1", labelIds: ["l-food", "ghost-id"] })],
      { labels, categories, accounts, includeHeader: false },
    );

    expect(tsv).toBe("2026-05-16\tBCA\tMakanan\t-20000\tSemangka\t\tFood");
  });

  it("falls back to empty values for unknown category/account and missing fields", () => {
    const tsv = formatRowsForSheets(
      [
        {
          id: "1",
          date: "2026-05-16",
          item: "Tanpa kategori",
          amount: null,
          categoryId: "ghost",
          accountId: null,
          labelIds: [],
          notes: "",
          source: "manual-input" as const,
        },
      ],
      { labels, categories, accounts, includeHeader: false },
    );

    expect(tsv).toBe("2026-05-16\t\t\t\tTanpa kategori\t\t");
  });

  it("sanitizes cells that contain tabs or newlines", () => {
    expect(sanitizeTsvCell('Say "halo"\ndunia')).toBe('"Say ""halo""\ndunia"');
    expect(sanitizeTsvCell("plain")).toBe("plain");
  });
});
