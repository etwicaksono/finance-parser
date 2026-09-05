import type { AccountOption, CategoryOption, LabelOption, TransactionRow } from "@/types";

/**
 * Escape a value for a single TSV cell.
 */
export function sanitizeTsvCell(value: string): string {
  if (value.includes("\n") || value.includes("\r") || value.includes("\t") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Column order used by the Copy All / Copy Selected Rows action. It mirrors the
 * layout the user pastes into Google Sheets, which deliberately differs from the
 * in-app column order: the UI shows Date | ... | Category | Labels, but the
 * Sheets target expects an empty placeholder between Item and Labels.
 *
 * Date | Account | Category | Amount | Item | <empty> | Labels
 */
export const GOOGLE_SHEETS_HEADERS = ["Date", "Account", "Category", "Amount", "Item", "", "Labels"];

export interface SheetsCopyOptions {
  labels: LabelOption[];
  categories: CategoryOption[];
  accounts: AccountOption[];
  includeHeader: boolean;
}

/** Serialize a single row into the fixed seven-field Google Sheets layout. */
export function formatRowForSheets(
  row: TransactionRow,
  lookup: Pick<SheetsCopyOptions, "labels" | "categories" | "accounts">,
): string {
  const { labels, categories, accounts } = lookup;
  const labelById = new Map(labels.map((label) => [label.id, label.name]));

  const labelNames = (row.labelIds ?? [])
    .map((id) => labelById.get(id))
    .filter((name): name is string => Boolean(name));

  return [
    sanitizeTsvCell(row.date || ""),
    sanitizeTsvCell(accounts.find((a) => a.id === row.accountId)?.name || ""),
    sanitizeTsvCell(categories.find((c) => c.id === row.categoryId)?.name || ""),
    row.amount !== null && row.amount !== undefined ? row.amount.toString() : "",
    sanitizeTsvCell(row.item || ""),
    "",
    sanitizeTsvCell(labelNames.join(", ")),
  ].join("\t");
}

/**
 * Serialize rows for Google Sheets as TSV using the fixed seven-field order.
 * The sixth field is intentionally left blank as a placeholder. Labels are
 * comma-space joined names (e.g. `Food, Household`) so the destination cell can
 * be a multiple-selection dropdown.
 */
export function formatRowsForSheets(rows: TransactionRow[], options: SheetsCopyOptions): string {
  const { includeHeader } = options;
  const tsvData = rows.map((row) => formatRowForSheets(row, options));

  return includeHeader
    ? [GOOGLE_SHEETS_HEADERS.join("\t"), ...tsvData].join("\n")
    : tsvData.join("\n");
}
