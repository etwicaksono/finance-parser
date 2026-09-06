import { TransactionRow, CategoryOption, AccountOption, LabelOption } from "@/types";
import { KeywordMapping } from "@/features/suggestions/types";
import { extractAnnotatedAmount } from "@/features/parser/price-annotation";
import { parseLabelValue, joinLabelNames } from "@/features/labels/label-utils";

// ---------------------------------------------------------------------------
// Context & Interfaces
// ---------------------------------------------------------------------------

export interface ColumnHandlerContext {
  categories: CategoryOption[];
  accounts: AccountOption[];
  labels: LabelOption[];
  contraKeywords: string[];
  keywordMappings: KeywordMapping[];
  onCategoryChange?: (rowId: string, item: string, newCategoryId: string) => void;
  onLabelsChange?: (rowId: string, item: string, labelIds: string[]) => void;
  notifyUnknownLabels?: (unknownTokens: string[]) => void;
}

export interface ColumnHandler {
  /** Whether this column can be edited inline */
  isEditable: boolean;
  /** Whether this column uses a dropdown editor (not a text/date editor) */
  isDropdown: boolean;
  /** Apply a value update to a row for this column */
  applyUpdate: (row: TransactionRow, value: string, ctx: ColumnHandlerContext) => void;
  /** Get the display value for copy/paste operations */
  getCellValue: (row: TransactionRow, ctx: ColumnHandlerContext) => string;
}

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

/**
 * Adjust the sign of a numeric amount based on the category's sign type
 * stored in the database (income → positive, expense → negative, unless it's
 * a contra item; "both" leaves the amount untouched).
 */
function adjustAmountSign(
  amount: number,
  categoryId: string | null,
  ctx: ColumnHandlerContext,
  itemText: string,
): number {
  const category = ctx.categories.find((c) => c.id === categoryId);
  if (!category) return amount;

  const sign = category.signType ?? "both";
  const isContraItem = ctx.contraKeywords.some((kw) =>
    itemText.toLowerCase().includes(kw.toLowerCase()),
  );

  if (sign === "income") return Math.abs(amount);
  if (sign === "expense") {
    if (!(isContraItem && amount > 0)) return -Math.abs(amount);
  }
  return amount;
}

// ---------------------------------------------------------------------------
// Per-Column Handlers
// ---------------------------------------------------------------------------

const dateHandler: ColumnHandler = {
  isEditable: true,
  isDropdown: false,
  applyUpdate: (row, value) => {
    row.date = value;
  },
  getCellValue: (row) => row.date || "",
};

const accountHandler: ColumnHandler = {
  isEditable: true,
  isDropdown: true,
  applyUpdate: (row, value, ctx) => {
    const matched = ctx.accounts.find(
      (a) => a.name.toLowerCase() === value.toLowerCase() || a.id === value,
    );
    row.accountId = matched ? matched.id : null;
  },
  getCellValue: (row, ctx) =>
    ctx.accounts.find((a) => a.id === row.accountId)?.name || "",
};

const categoryHandler: ColumnHandler = {
  isEditable: true,
  isDropdown: true,
  applyUpdate: (row, value, ctx) => {
    const matched = ctx.categories.find(
      (c) => c.name.toLowerCase() === value.toLowerCase() || c.id === value,
    );
    const oldVal = row.categoryId;
    const newVal = matched ? matched.id : null;

    row.categoryId = newVal;
    row.isCategoryManuallySet = true;

    if (newVal) row.isUnmappedItem = false;

    if (oldVal !== newVal && newVal) {
      ctx.onCategoryChange?.(row.id, row.item, newVal);
    }

    // Auto-adjust amount sign when category changes
    if (typeof row.amount === "number") {
      row.amount = adjustAmountSign(row.amount, newVal, ctx, row.item ?? "");
    }
  },
  getCellValue: (row, ctx) =>
    ctx.categories.find((c) => c.id === row.categoryId)?.name || "",
};

const amountHandler: ColumnHandler = {
  isEditable: true,
  isDropdown: false,
  applyUpdate: (row, value, ctx) => {
    const parsed = parseFloat(value.replace(/\./g, "").replace(",", "."));
    let newAmount = isNaN(parsed) ? null : parsed;

    if (newAmount !== null && row.categoryId) {
      newAmount = adjustAmountSign(newAmount, row.categoryId, ctx, row.item ?? "");
    }

    row.amount = newAmount;
  },
  getCellValue: (row) =>
    row.amount !== null && row.amount !== undefined ? row.amount.toString() : "",
};

const itemHandler: ColumnHandler = {
  isEditable: true,
  isDropdown: false,
  applyUpdate: (row, value, ctx) => {
    row.item = value;

    if (!value.trim()) {
      row.amount = null;
      row.categoryId = null;
      row.labelIds = [];
      row.isUnmappedItem = false;
      row.isCategoryManuallySet = false;
      return;
    }

    // Parse inline price annotations (e.g. "Boba => 25k")
    let sum = 0;
    let hasPrice = false;
    value.split("\n").forEach((line: string) => {
      const rawPrice = extractAnnotatedAmount(line);
      if (rawPrice !== null) {
        hasPrice = true;
        const isContraItem = ctx.contraKeywords.some((kw) =>
          line.toLowerCase().includes(kw.toLowerCase()),
        );
        sum += isContraItem ? -rawPrice : rawPrice;
      }
    });
    if (hasPrice) {
      const currentSign = (row.amount ?? -1) < 0 ? -1 : 1;
      row.amount = sum * currentSign;
    }

    row.isCategoryManuallySet = false;

    // Auto-map category & labels from keyword mappings
    if (value.trim() && ctx.keywordMappings.length > 0) {
      const lowerItem = value.toLowerCase().trim();
      const match = ctx.keywordMappings.find((m) =>
        lowerItem.includes(m.keyword.toLowerCase()),
      );

      if (match) {
        row.isUnmappedItem = false;
        row.labelIds = match.labelIds ?? [];
        if (!row.isCategoryManuallySet) {
          row.categoryId = match.categoryId;
          if (typeof row.amount === "number") {
            row.amount = adjustAmountSign(row.amount, match.categoryId, ctx, lowerItem);
          }
        }
      } else {
        row.categoryId = null;
        row.labelIds = [];
        row.isUnmappedItem = true;
      }
    } else {
      row.labelIds = [];
      row.isUnmappedItem = false;
    }
  },
  getCellValue: (row) => row.item || "",
};

const notesHandler: ColumnHandler = {
  isEditable: true,
  isDropdown: false,
  applyUpdate: (row, value) => {
    row.notes = value;
  },
  getCellValue: (row) => row.notes || "",
};

const labelIdsHandler: ColumnHandler = {
  isEditable: true,
  isDropdown: true,
  applyUpdate: (row, value, ctx) => {
    const parsed = parseLabelValue(value, ctx.labels ?? []);
    const oldIds = row.labelIds ?? [];

    if (parsed.unknownTokens.length > 0) {
      ctx.notifyUnknownLabels?.(parsed.unknownTokens);
    }

    const newIds = parsed.ids;
    row.labelIds = newIds;

    const changed =
      oldIds.length !== newIds.length || oldIds.some((id) => !newIds.includes(id));

    if (changed && row.item) {
      ctx.onLabelsChange?.(row.id, row.item, newIds);
    }
  },
  getCellValue: (row, ctx) => joinLabelNames(row.labelIds ?? [], ctx.labels ?? []),
};

const receiptNameHandler: ColumnHandler = {
  isEditable: false,
  isDropdown: false,
  applyUpdate: (row, value) => {
    row.receiptName = value;
  },
  getCellValue: (row) => row.receiptName || "",
};

// ---------------------------------------------------------------------------
// Registry & Public API
// ---------------------------------------------------------------------------

export const columnHandlers: Record<string, ColumnHandler> = {
  date: dateHandler,
  accountId: accountHandler,
  categoryId: categoryHandler,
  labelIds: labelIdsHandler,
  amount: amountHandler,
  item: itemHandler,
  notes: notesHandler,
  receiptName: receiptNameHandler,
};

export function isColumnEditable(key: string): boolean {
  return columnHandlers[key]?.isEditable ?? false;
}

export function isColumnDropdown(key: string): boolean {
  return columnHandlers[key]?.isDropdown ?? false;
}

export function applyColumnUpdate(
  row: TransactionRow,
  key: string,
  value: string,
  ctx: ColumnHandlerContext,
): void {
  const handler = columnHandlers[key];
  if (handler) {
    handler.applyUpdate(row, value, ctx);
  } else {
    // Fallback for unknown columns: just set the value directly
    (row as unknown as Record<string, unknown>)[key] = value;
  }
}

export function getColumnCellValue(
  row: TransactionRow,
  key: string,
  ctx: ColumnHandlerContext,
): string {
  const handler = columnHandlers[key];
  if (handler) {
    return handler.getCellValue(row, ctx);
  }
  return String((row as unknown as Record<string, unknown>)[key] ?? "");
}
