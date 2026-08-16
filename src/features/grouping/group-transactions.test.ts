import { describe, it, expect } from "vitest";
import { TransactionRow, CategoryOption } from "@/types";
import {
  computeGroupedTransactions,
  applyGroupedChanges,
  buildGroupKey,
  formatItemWithPrice,
} from "./group-transactions";

const categories: CategoryOption[] = [
  { id: "cat-food", name: "Food" },
  { id: "cat-transport", name: "Transport" },
];

const ACC_BCA = "acc-bca";
const ACC_CASH = "acc-cash";

function row(overrides: Partial<TransactionRow> & { id: string }): TransactionRow {
  return {
    date: "2026-05-16",
    item: "Item",
    amount: -10000,
    categoryId: "cat-food",
    accountId: null,
    notes: "",
    ...overrides,
  };
}

describe("formatItemWithPrice", () => {
  it("appends a k-shorthand price", () => {
    expect(formatItemWithPrice("Boba", -25000)).toBe("Boba => 25k");
    expect(formatItemWithPrice("Boba", 25000)).toBe("Boba => 25k");
    expect(formatItemWithPrice("Boba", -25500)).toBe("Boba => 25.5k");
  });

  it("keeps decimals that would otherwise be rounded away", () => {
    expect(formatItemWithPrice("Indihome kemloko", -226440)).toBe("Indihome kemloko => 226.44k");
    expect(formatItemWithPrice("Biaya Layanan", -1032)).toBe("Biaya Layanan => 1.032k");
  });

  it("leaves the item untouched when there is no amount or it already has one", () => {
    expect(formatItemWithPrice("Boba", null)).toBe("Boba");
    expect(formatItemWithPrice("Boba", 0)).toBe("Boba");
    expect(formatItemWithPrice("Boba => 25k", -30000)).toBe("Boba => 25k");
  });
});

describe("buildGroupKey", () => {
  it("keys on date, category name and account", () => {
    expect(buildGroupKey(row({ id: "1", accountId: ACC_BCA }), categories)).toBe(
      "2026-05-16::Food::acc-bca",
    );
  });

  it("falls back for missing category and account", () => {
    expect(buildGroupKey(row({ id: "1", categoryId: null }), categories)).toBe(
      "2026-05-16::Unknown::no-account",
    );
  });

  it("falls back to the raw id for an unknown category", () => {
    expect(buildGroupKey(row({ id: "1", categoryId: "cat-ghost" }), categories)).toBe(
      "2026-05-16::cat-ghost::no-account",
    );
  });
});

describe("computeGroupedTransactions (raw -> grouped)", () => {
  it("merges rows sharing date, category and account", () => {
    const raw = [
      row({ id: "1", item: "Nasi => 10k", amount: -10000, accountId: ACC_BCA }),
      row({ id: "2", item: "Ayam => 20k", amount: -20000, accountId: ACC_BCA }),
    ];

    const grouped = computeGroupedTransactions(raw, {}, categories);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.amount).toBe(-30000);
    expect(grouped[0]?.accountId).toBe(ACC_BCA);
    expect(grouped[0]?.rawItemIds).toEqual(["1", "2"]);
    expect(grouped[0]?.item).toBe("Nasi => 10k\nAyam => 20k");
  });

  it("does NOT merge rows with different accounts", () => {
    const raw = [
      row({ id: "1", item: "Nasi => 10k", amount: -10000, accountId: ACC_BCA }),
      row({ id: "2", item: "Ayam => 20k", amount: -20000, accountId: ACC_CASH }),
    ];

    const grouped = computeGroupedTransactions(raw, {}, categories);

    expect(grouped).toHaveLength(2);
    expect(grouped.map((g) => g.accountId).sort()).toEqual([ACC_BCA, ACC_CASH]);
    expect(grouped.map((g) => g.amount)).toEqual([-10000, -20000]);
  });

  it("keeps a row with an account separate from one without", () => {
    const raw = [
      row({ id: "1", item: "Nasi => 10k", accountId: null }),
      row({ id: "2", item: "Ayam => 20k", accountId: ACC_BCA }),
    ];

    const grouped = computeGroupedTransactions(raw, {}, categories);

    expect(grouped).toHaveLength(2);
    // The group carrying an account must expose it, regardless of ordering.
    expect(grouped.find((g) => g.rawItemIds?.includes("2"))?.accountId).toBe(ACC_BCA);
    expect(grouped.find((g) => g.rawItemIds?.includes("1"))?.accountId).toBeNull();
  });

  it("exposes the account even when the account-less row comes first", () => {
    const raw = [
      row({ id: "1", item: "Nasi => 10k", accountId: null }),
      row({ id: "2", item: "Ayam => 20k", accountId: ACC_BCA, amount: -20000 }),
      row({ id: "3", item: "Teh => 5k", accountId: ACC_BCA, amount: -5000 }),
    ];

    const grouped = computeGroupedTransactions(raw, {}, categories);
    const bcaGroup = grouped.find((g) => g.accountId === ACC_BCA);

    expect(bcaGroup).toBeDefined();
    expect(bcaGroup?.rawItemIds).toEqual(["2", "3"]);
    expect(bcaGroup?.amount).toBe(-25000);
  });

  it("splits by date and by category", () => {
    const raw = [
      row({ id: "1", date: "2026-05-16", categoryId: "cat-food" }),
      row({ id: "2", date: "2026-05-17", categoryId: "cat-food" }),
      row({ id: "3", date: "2026-05-16", categoryId: "cat-transport" }),
    ];

    expect(computeGroupedTransactions(raw, {}, categories)).toHaveLength(3);
  });

  it("collapses repeated item names into a counted line", () => {
    const raw = [
      row({ id: "1", item: "Kopi => 15k", amount: -15000, accountId: ACC_BCA }),
      row({ id: "2", item: "Kopi => 15k", amount: -15000, accountId: ACC_BCA }),
    ];

    const grouped = computeGroupedTransactions(raw, {}, categories);

    expect(grouped[0]?.item).toBe("2 Kopi => 30k");
    expect(grouped[0]?.amount).toBe(-30000);
  });

  it("merges distinct notes without duplicating them", () => {
    const raw = [
      row({ id: "1", notes: "Sender: Budi", accountId: ACC_BCA }),
      row({ id: "2", notes: "Sender: Budi", accountId: ACC_BCA }),
      row({ id: "3", notes: "Sender: Siti", accountId: ACC_BCA }),
    ];

    expect(computeGroupedTransactions(raw, {}, categories)[0]?.notes).toBe(
      "Sender: Budi | Sender: Siti",
    );
  });

  it("treats null amounts as zero", () => {
    const raw = [
      row({ id: "1", item: "Nasi", amount: null, accountId: ACC_BCA }),
      row({ id: "2", item: "Ayam => 20k", amount: -20000, accountId: ACC_BCA }),
    ];

    expect(computeGroupedTransactions(raw, {}, categories)[0]?.amount).toBe(-20000);
  });

  it("applies an amount override on top of the computed sum", () => {
    const raw = [
      row({ id: "1", amount: -10000, accountId: ACC_BCA }),
      row({ id: "2", amount: -20000, accountId: ACC_BCA }),
    ];
    const key = "2026-05-16::Food::acc-bca";

    expect(computeGroupedTransactions(raw, { [key]: -50000 }, categories)[0]?.amount).toBe(-50000);
  });

  it("does not mutate the raw input rows", () => {
    const raw = [row({ id: "1", item: "Nasi => 10k", accountId: ACC_BCA })];

    computeGroupedTransactions(raw, {}, categories);

    expect(raw[0]?.item).toBe("Nasi => 10k");
    expect(raw[0]?.id).toBe("1");
  });

  it("returns an empty array for empty input", () => {
    expect(computeGroupedTransactions([], {}, categories)).toEqual([]);
  });
});

describe("applyGroupedChanges (grouped -> raw)", () => {
  const raw = [
    row({ id: "1", item: "Nasi => 10k", amount: -10000, accountId: ACC_BCA }),
    row({ id: "2", item: "Ayam => 20k", amount: -20000, accountId: ACC_BCA }),
    row({ id: "3", item: "Bus => 5k", amount: -5000, categoryId: "cat-transport" }),
  ];
  const display = computeGroupedTransactions(raw, {}, categories);

  it("fans an account edit out to every raw row of the group", () => {
    const edited = display.map((g) =>
      g.accountId === ACC_BCA ? { ...g, accountId: ACC_CASH } : g,
    );

    const result = applyGroupedChanges(edited, display, raw, {});

    expect(result.rawTransactions.find((r) => r.id === "1")?.accountId).toBe(ACC_CASH);
    expect(result.rawTransactions.find((r) => r.id === "2")?.accountId).toBe(ACC_CASH);
    // Untouched group keeps its account
    expect(result.rawTransactions.find((r) => r.id === "3")?.accountId).toBeNull();
  });

  it("round-trips an account edit back into a single regrouped row", () => {
    const edited = display.map((g) =>
      g.accountId === ACC_BCA ? { ...g, accountId: ACC_CASH } : g,
    );

    const result = applyGroupedChanges(edited, display, raw, {});
    const regrouped = computeGroupedTransactions(result.rawTransactions, result.overrides, categories);

    const cashGroup = regrouped.find((g) => g.accountId === ACC_CASH);
    expect(cashGroup?.rawItemIds).toEqual(["1", "2"]);
    expect(cashGroup?.amount).toBe(-30000);
    expect(regrouped).toHaveLength(2);
  });

  it("fans category and date edits out to the group's raw rows", () => {
    const target = display.find((g) => g.accountId === ACC_BCA)!;
    const edited = display.map((g) =>
      g.id === target.id ? { ...g, categoryId: "cat-transport", date: "2026-05-20" } : g,
    );

    const result = applyGroupedChanges(edited, display, raw, {});

    for (const id of ["1", "2"]) {
      const updated = result.rawTransactions.find((r) => r.id === id);
      expect(updated?.categoryId).toBe("cat-transport");
      expect(updated?.date).toBe("2026-05-20");
    }
  });

  it("records an amount edit as a group override without touching raw amounts", () => {
    const target = display.find((g) => g.accountId === ACC_BCA)!;
    const edited = display.map((g) => (g.id === target.id ? { ...g, amount: -99000 } : g));

    const result = applyGroupedChanges(edited, display, raw, {});

    expect(result.overrides[target.id]).toBe(-99000);
    expect(result.rawTransactions.find((r) => r.id === "1")?.amount).toBe(-10000);
    expect(result.rawTransactions.find((r) => r.id === "2")?.amount).toBe(-20000);
  });

  it("ignores an amount cleared to null", () => {
    const target = display.find((g) => g.accountId === ACC_BCA)!;
    const edited = display.map((g) => (g.id === target.id ? { ...g, amount: null } : g));

    expect(applyGroupedChanges(edited, display, raw, {}).overrides).toEqual({});
  });

  it("deleting a grouped row removes all of its raw rows and its override", () => {
    const target = display.find((g) => g.accountId === ACC_BCA)!;
    const edited = display.filter((g) => g.id !== target.id);

    const result = applyGroupedChanges(edited, display, raw, { [target.id]: -99000 });

    expect(result.rawTransactions.map((r) => r.id)).toEqual(["3"]);
    expect(result.overrides[target.id]).toBeUndefined();
  });

  it("keeps overrides belonging to groups that still exist", () => {
    const target = display.find((g) => g.accountId === ACC_BCA)!;
    const other = display.find((g) => g.id !== target.id)!;
    const edited = display.filter((g) => g.id !== target.id);

    const result = applyGroupedChanges(edited, display, raw, {
      [target.id]: -99000,
      [other.id]: -7000,
    });

    expect(result.overrides).toEqual({ [other.id]: -7000 });
  });

  it("is a no-op when nothing changed", () => {
    const result = applyGroupedChanges(display, display, raw, {});

    expect(result.rawTransactions).toEqual(raw);
    expect(result.overrides).toEqual({});
  });

  it("ignores grouped rows that are not part of the current display", () => {
    const result = applyGroupedChanges(
      [...display, row({ id: "ghost-key", accountId: ACC_CASH })],
      display,
      raw,
      {},
    );

    expect(result.rawTransactions).toEqual(raw);
    expect(result.overrides).toEqual({});
  });

  it("does not mutate the raw array or the overrides passed in", () => {
    const target = display.find((g) => g.accountId === ACC_BCA)!;
    const overrides = { [target.id]: -1000 };
    const edited = display.map((g) =>
      g.id === target.id ? { ...g, accountId: ACC_CASH, amount: -99000 } : g,
    );

    applyGroupedChanges(edited, display, raw, overrides);

    expect(raw.find((r) => r.id === "1")?.accountId).toBe(ACC_BCA);
    expect(overrides).toEqual({ [target.id]: -1000 });
  });
});
