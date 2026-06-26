import * as React from "react";
import { CellPos } from "../types";
import { TransactionRow } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

export function useSpreadsheetSelection(tableData: TransactionRow[], columns: ColumnDef<TransactionRow>[]) {
  const [selectionAnchor, setSelectionAnchor] = React.useState<CellPos | null>(null);
  const [selectionFocus, setSelectionFocus] = React.useState<CellPos | null>(null);
  const [multiSelections, setMultiSelections] = React.useState<{minRow: number; maxRow: number; minCol: number; maxCol: number}[]>([]);

  const selectionRange = React.useMemo(() => {
    if (!selectionAnchor || !selectionFocus) return null;
    return {
      minRow: Math.min(selectionAnchor.rowIndex, selectionFocus.rowIndex),
      maxRow: Math.max(selectionAnchor.rowIndex, selectionFocus.rowIndex),
      minCol: Math.min(selectionAnchor.colIndex, selectionFocus.colIndex),
      maxCol: Math.max(selectionAnchor.colIndex, selectionFocus.colIndex),
    };
  }, [selectionAnchor, selectionFocus]);

  const isCellSelected = React.useCallback(
    (rowIndex: number, colIndex: number) => {
      let selected = false;
      if (selectionRange) {
        selected = (
          rowIndex >= selectionRange.minRow &&
          rowIndex <= selectionRange.maxRow &&
          colIndex >= selectionRange.minCol &&
          colIndex <= selectionRange.maxCol
        );
      }
      if (!selected) {
        selected = multiSelections.some(range => 
          rowIndex >= range.minRow &&
          rowIndex <= range.maxRow &&
          colIndex >= range.minCol &&
          colIndex <= range.maxCol
        );
      }
      return selected;
    },
    [selectionRange, multiSelections]
  );

  const selectionStats = React.useMemo(() => {
    if (!selectionRange && multiSelections.length === 0) return null;
    
    let sum = 0;
    let count = 0;
    let numericCount = 0;
    let min = Infinity;
    let max = -Infinity;
    const processed = new Set<string>();
    
    const ranges = [...multiSelections];
    if (selectionRange) ranges.push(selectionRange);
    
    for (const range of ranges) {
      for (let r = range.minRow; r <= range.maxRow; r++) {
        for (let c = range.minCol; c <= range.maxCol; c++) {
           const keyStr = `${r},${c}`;
           if (processed.has(keyStr)) continue;
           processed.add(keyStr);

           count++;
           const row = tableData[r];
           if (!row) continue;

           const colDef = columns[c];
           const key = colDef && "accessorKey" in colDef ? (colDef as { accessorKey: string }).accessorKey : null;
           if (!key) continue;

           const rawVal = (row as unknown as Record<string, unknown>)[key];
           if (typeof rawVal === "number") {
             sum += rawVal;
             numericCount++;
             if (rawVal < min) min = rawVal;
             if (rawVal > max) max = rawVal;
           } else if (typeof rawVal === "string") {
             const parsed = parseFloat(rawVal.replace(/\./g, "").replace(",", "."));
             if (!isNaN(parsed)) {
               sum += parsed;
               numericCount++;
               if (parsed < min) min = parsed;
               if (parsed > max) max = parsed;
             }
           }
        }
      }
    }
    
    if (count <= 1) return null;
    const avg = numericCount > 0 ? sum / numericCount : 0;
    return { sum, count, numericCount, avg, min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
  }, [selectionRange, multiSelections, tableData, columns]);

  const isAnySingleCellSelected = multiSelections.length === 0 && selectionAnchor &&
    selectionFocus &&
    selectionAnchor.rowIndex === selectionFocus.rowIndex &&
    selectionAnchor.colIndex === selectionFocus.colIndex;

  const selectionLabel = (selectionRange || multiSelections.length > 0) && !isAnySingleCellSelected
    ? (() => {
        if (multiSelections.length === 0 && selectionRange) {
           return `${(selectionRange.maxRow - selectionRange.minRow + 1)}R × ${(selectionRange.maxCol - selectionRange.minCol + 1)}C selected`;
        }
        let count = 0;
        const processed = new Set<string>();
        const ranges = [...multiSelections];
        if (selectionRange) ranges.push(selectionRange);
        for (const range of ranges) {
          for (let r = range.minRow; r <= range.maxRow; r++) {
            for (let c = range.minCol; c <= range.maxCol; c++) {
              const keyStr = `${r},${c}`;
              if (!processed.has(keyStr)) {
                processed.add(keyStr);
                count++;
              }
            }
          }
        }
        return `${count} cells selected`;
      })()
    : null;

  return {
    selectionAnchor,
    setSelectionAnchor,
    selectionFocus,
    setSelectionFocus,
    multiSelections,
    setMultiSelections,
    selectionRange,
    isCellSelected,
    selectionStats,
    isAnySingleCellSelected,
    selectionLabel,
  };
}
