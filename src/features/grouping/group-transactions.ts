import { TransactionRow, CategoryOption } from "@/types";
import { formatPriceAnnotation } from "../parser/price-annotation";
import { sortedLabelIds } from "../labels/label-utils";

/**
 * Appends a shorthand price annotation to an item name (e.g. "Boba => 25k").
 * Leaves the item untouched when it already carries an annotation.
 */
export function formatItemWithPrice(item: string, amount: number | null | undefined): string {
  if (!amount) return item;
  if (item.includes("=>")) return item;
  return `${item} => ${formatPriceAnnotation(amount)}`;
}

/**
 * Builds the identity of a grouped row. Rows only merge when date, category,
 * account and label set all match, so labels never bleed across groups and an
 * account/category edited in Raw View never collapses into the wrong group.
 */
export function buildGroupKey(row: TransactionRow, categories: CategoryOption[]): string {
  let catForGrouping = "Unknown";
  if (row.categoryId) {
    catForGrouping = categories.find((c) => c.id === row.categoryId)?.name || row.categoryId;
  }
  const labelPart = sortedLabelIds(row.labelIds ?? []).join(",");
  return `${row.date}::${catForGrouping}::${row.accountId ?? "no-account"}::${labelPart || "-"}`;
}

/**
 * Collapses raw transactions into one row per (date, category, account),
 * summing amounts and merging item names into a multi-line summary.
 * `overrides` lets a manually edited group total win over the computed sum.
 */
export function computeGroupedTransactions(
  raw: TransactionRow[],
  overrides: Record<string, number>,
  categories: CategoryOption[],
): TransactionRow[] {
  const map = new Map<
    string,
    TransactionRow & { subItems: Map<string, { amount: number; count: number }> }
  >();

  for (const rawRow of raw) {
    const rowForGrouping: TransactionRow = {
      ...rawRow,
      labelIds: sortedLabelIds(rawRow.labelIds),
    };
    const key = buildGroupKey(rowForGrouping, categories);
    const existing = map.get(key);
    const baseName = (rowForGrouping.item || "").split("=>")[0]?.trim() || "";
    const amount = rowForGrouping.amount ?? 0;

    if (existing) {
      existing.amount = (existing.amount ?? 0) + amount;

      const sub = existing.subItems.get(baseName);
      if (sub) {
        existing.subItems.set(baseName, { amount: sub.amount + amount, count: sub.count + 1 });
      } else {
        existing.subItems.set(baseName, { amount, count: 1 });
      }

      if (rowForGrouping.notes && !(existing.notes || "").includes(rowForGrouping.notes)) {
        existing.notes = [existing.notes, rowForGrouping.notes].filter(Boolean).join(" | ");
      }
      existing.rawItemIds!.push(rowForGrouping.id);
    } else {
      const subItems = new Map<string, { amount: number; count: number }>();
      subItems.set(baseName, { amount, count: 1 });
      map.set(key, { ...rowForGrouping, id: key, rawItemIds: [rowForGrouping.id], subItems, amount });
    }
  }

  return Array.from(map.values()).map((row) => {
    if (overrides[row.id] !== undefined) {
      row.amount = overrides[row.id] ?? null;
    }

    const itemLines: string[] = [];
    for (const [baseName, sub] of row.subItems.entries()) {
      const displayName = sub.count > 1 ? `${sub.count} ${baseName}` : baseName;
      itemLines.push(formatItemWithPrice(displayName, sub.amount));
    }
    row.item = itemLines.join("\n");

    return row as TransactionRow;
  });
}

export interface GroupedChangesResult {
  rawTransactions: TransactionRow[];
  overrides: Record<string, number>;
}

/**
 * Writes edits made in Grouped View back onto the underlying raw transactions.
 * Amount edits become group overrides; date/category/account edits fan out to
 * every raw row of the group; deleted groups drop all their raw rows.
 */
export function applyGroupedChanges(
  newData: TransactionRow[],
  currentDisplay: TransactionRow[],
  raw: TransactionRow[],
  overrides: Record<string, number>,
): GroupedChangesResult {
  let updatedRaw = [...raw];
  const updatedOverrides = { ...overrides };

  const currentIds = new Set(currentDisplay.map((r) => r.id));
  const newIds = new Set(newData.map((r) => r.id));
  const deletedIds: string[] = [];
  for (const id of currentIds) {
    if (!newIds.has(id)) deletedIds.push(id);
  }
  if (deletedIds.length > 0) {
    const rawIdsToDelete = new Set<string>();
    for (const id of deletedIds) {
      const groupedRow = currentDisplay.find((r) => r.id === id);
      if (groupedRow?.rawItemIds) {
        for (const rawId of groupedRow.rawItemIds) {
          rawIdsToDelete.add(rawId);
        }
      }
    }
    updatedRaw = updatedRaw.filter((r) => !rawIdsToDelete.has(r.id));
    for (const id of deletedIds) {
      delete updatedOverrides[id];
    }
  }

  newData.forEach((newRow) => {
    const oldRow = currentDisplay.find((r) => r.id === newRow.id);
    if (!oldRow) return;

    if (oldRow.amount !== newRow.amount && newRow.amount !== null) {
      updatedOverrides[newRow.id] = newRow.amount;
    }
    const categoryChanged = oldRow.categoryId !== newRow.categoryId;
    const accountChanged = oldRow.accountId !== newRow.accountId;
    const dateChanged = oldRow.date !== newRow.date;
    const labelChanged =
      (oldRow.labelIds ?? []).join("|") !== (newRow.labelIds ?? []).join("|");

    if (categoryChanged || accountChanged || dateChanged || labelChanged) {
      updatedRaw = updatedRaw.map((rawRow) => {
        if (newRow.rawItemIds?.includes(rawRow.id)) {
          return {
            ...rawRow,
            ...(categoryChanged && { categoryId: newRow.categoryId }),
            ...(accountChanged && { accountId: newRow.accountId }),
            ...(dateChanged && { date: newRow.date }),
            ...(labelChanged && { labelIds: newRow.labelIds ?? [] }),
          };
        }
        return rawRow;
      });
    }
  });

  return { rawTransactions: updatedRaw, overrides: updatedOverrides };
}
