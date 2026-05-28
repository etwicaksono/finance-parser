import { TransactionRow } from "@/types";
import { differenceInDays, parseISO, isValid } from "date-fns";
import Fuse from "fuse.js";

/**
 * Detects if new transactions are possible duplicates of existing ones.
 * Marks `isDuplicate: true` on suspected duplicate rows.
 * Criteria: Exact same amount, exact same date, and item name is very similar or identical.
 */
export function detectDuplicates(
  newRows: TransactionRow[],
  existingRows: TransactionRow[]
): TransactionRow[] {
  const allRows = [...existingRows];

  return newRows.map((newRow) => {
    let isDuplicate = false;

    // We only check if amount is present
    if (newRow.amount !== null && newRow.amount !== undefined) {
      for (const existingRow of allRows) {
        if (existingRow.amount !== newRow.amount) continue;

        // Check exact date match
        if (newRow.date !== existingRow.date) continue;

        // Check item similarity
        const item1 = newRow.item.trim().toLowerCase();
        const item2 = existingRow.item.trim().toLowerCase();

        if (item1 === item2) {
          isDuplicate = true;
          break;
        }

        // Fuzzy match for minor typos if exact match fails
        const fuse = new Fuse([{ item: item2 }], { keys: ["item"], threshold: 0.3 });
        if (fuse.search(item1).length > 0) {
          isDuplicate = true;
          break;
        }
      }
    }

    const processedRow = { ...newRow, isDuplicate };
    // Add to allRows so subsequent newRows can be compared against this one too
    allRows.push(processedRow);
    return processedRow;
  });
}
