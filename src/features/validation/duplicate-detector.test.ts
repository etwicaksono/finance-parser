import { describe, it, expect } from "vitest";
import { detectDuplicates } from "./duplicate-detector";
import { TransactionRow } from "@/types";

describe("detectDuplicates", () => {
  const createRow = (id: string, item: string, amount: number, date: string): TransactionRow => ({
    id,
    item,
    amount,
    date,
    categoryId: null,
    accountId: null,
    notes: "",
  });

  const existingRows = [
    createRow("1", "Makan Siang", -25000, "2026-05-10"),
    createRow("2", "Bensin", -50000, "2026-05-15"),
  ];

  it("detects exact duplicate", () => {
    const newRows = [createRow("3", "Makan Siang", -25000, "2026-05-10")];
    const result = detectDuplicates(newRows, existingRows);
    expect(result[0]?.isDuplicate).toBe(true);
  });

  it("ignores same item and amount if date is different (even if nearby)", () => {
    const newRows = [createRow("3", "Makan Siang", -25000, "2026-05-12")];
    const result = detectDuplicates(newRows, existingRows);
    expect(result[0]?.isDuplicate).toBe(false);
  });

  it("ignores same item and amount if date is far", () => {
    const newRows = [createRow("3", "Makan Siang", -25000, "2026-05-14")];
    const result = detectDuplicates(newRows, existingRows);
    expect(result[0]?.isDuplicate).toBe(false);
  });

  it("detects duplicate with slight typo in item", () => {
    const newRows = [createRow("3", "bensn", -50000, "2026-05-15")];
    const result = detectDuplicates(newRows, existingRows);
    expect(result[0]?.isDuplicate).toBe(true);
  });

  it("ignores same date and amount if item is completely different", () => {
    const newRows = [createRow("3", "Grab", -50000, "2026-05-15")];
    const result = detectDuplicates(newRows, existingRows);
    expect(result[0]?.isDuplicate).toBe(false);
  });

  it("detects duplicates within the newRows array itself", () => {
    const newRows = [
      createRow("3", "Kopi", -15000, "2026-05-16"),
      createRow("4", "Kopi", -15000, "2026-05-16"), // duplicate of row 3
    ];
    const result = detectDuplicates(newRows, []);
    expect(result[0]?.isDuplicate).toBe(false);
    expect(result[1]?.isDuplicate).toBe(true);
  });
});
