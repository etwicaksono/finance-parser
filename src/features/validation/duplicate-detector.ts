import { TransactionRow } from "@/types";
import { differenceInDays, parseISO, isValid } from "date-fns";
import Fuse from "fuse.js";

/**
 * Detects if new transactions are possible duplicates of existing ones.
 * Marks `isDuplicate: true` on suspected duplicate rows.
 * Criteria: Exact same amount, date within 2 days, and item name is very similar or identical.
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

        // Check date proximity (within 2 days)
        let isDateNearby = false;
        if (newRow.date === existingRow.date) {
          isDateNearby = true;
        } else {
          const d1 = parseISO(newRow.date);
          const d2 = parseISO(existingRow.date);
          if (isValid(d1) && isValid(d2)) {
            if (Math.abs(differenceInDays(d1, d2)) <= 2) {
              isDateNearby = true;
            }
          }
        }

        if (!isDateNearby) continue;

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
