import * as React from "react";
import { Copy, ClipboardPaste, CalendarCheck, ArrowRightLeft } from "lucide-react";
import { TransactionRow } from "@/types";
import { ColumnDef, Table as ReactTable } from "@tanstack/react-table";

interface SpreadsheetContextMenuProps {
  contextMenu: { x: number; y: number; rowIndex: number; colIndex: number } | null;
  onClose: () => void;
  columns: ColumnDef<TransactionRow>[];
  tableData: TransactionRow[];
  setTableData: React.Dispatch<React.SetStateAction<TransactionRow[]>>;
  table: ReactTable<TransactionRow>;
  selectionRange: { minRow: number; maxRow: number; minCol: number; maxCol: number } | null;
  multiSelections: { minRow: number; maxRow: number; minCol: number; maxCol: number }[];
  onDataChange?: ((data: TransactionRow[]) => void) | undefined;
  handleCopyAction: (rowIndex: number, colIndex: number) => void;
  handlePasteAction: () => void;
  onAutoMapRows?: ((rowIndices: number[], useAI: boolean) => void) | undefined;
}

export function SpreadsheetContextMenu({
  contextMenu,
  onClose,
  columns,
  tableData,
  setTableData,
  table,
  selectionRange,
  multiSelections,
  onDataChange,
  handleCopyAction,
  handlePasteAction,
  onAutoMapRows,
}: SpreadsheetContextMenuProps) {
  if (!contextMenu) return null;

  const colDef = columns[contextMenu.colIndex];
  const key = colDef && "accessorKey" in colDef ? (colDef as { accessorKey: string }).accessorKey : null;
  const row = tableData[contextMenu.rowIndex];
  const isDateColumn = key === "date";
  const isDateWarning = isDateColumn && row?.isDateAmbiguous;

  return (
    <div
      className="fixed z-50 min-w-40 bg-white dark:bg-zinc-800 border dark:border-zinc-700 shadow-md rounded-md py-1 text-sm text-zinc-800 dark:text-zinc-200"
      style={{
        top: Math.min(contextMenu.y, window.innerHeight - 100),
        left: Math.min(contextMenu.x, window.innerWidth - 160),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {isDateWarning && (
        <button
          className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 text-green-600"
          onClick={() => {
            setTableData((prev) => {
              const newData = [...prev];
              const selectedRows = new Set<number>();
              const ranges = [...multiSelections];
              if (selectionRange) ranges.push(selectionRange);
              if (ranges.length > 0) {
                for (const range of ranges) {
                  for (let r = range.minRow; r <= range.maxRow; r++) {
                    selectedRows.add(r);
                  }
                }
              } else {
                selectedRows.add(contextMenu.rowIndex);
              }

              for (const r of selectedRows) {
                const rowData = table.getRowModel().rows[r];
                if (rowData) {
                  const origIndex = rowData.index;
                  newData[origIndex] = { ...newData[origIndex]!, isDateAmbiguous: false };
                }
              }
              onDataChange?.(newData);
              return newData;
            });
            onClose();
          }}
        >
          <CalendarCheck className="w-4 h-4" /> Confirm Date
        </button>
      )}
      {isDateColumn && (
        <button
          className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 text-blue-600 dark:text-blue-400"
          onClick={() => {
            setTableData((prev) => {
              const newData = [...prev];
              const selectedRows = new Set<number>();
              const ranges = [...multiSelections];
              if (selectionRange) ranges.push(selectionRange);
              if (ranges.length > 0) {
                for (const range of ranges) {
                  for (let r = range.minRow; r <= range.maxRow; r++) {
                    selectedRows.add(r);
                  }
                }
              } else {
                selectedRows.add(contextMenu.rowIndex);
              }

              for (const r of selectedRows) {
                const rowData = table.getRowModel().rows[r];
                if (rowData) {
                  const origIndex = rowData.index;
                  const currDate = newData[origIndex]?.date;
                  if (currDate) {
                    const parts = currDate.split("-");
                    if (parts.length === 3) {
                      const y = parts[0];
                      const m = parts[1];
                      const d = parts[2];
                      newData[origIndex] = {
                        ...newData[origIndex]!,
                        date: `${y}-${d}-${m}`,
                        isDateAmbiguous: false,
                      };
                    }
                  }
                }
              }
              onDataChange?.(newData);
              return newData;
            });
            onClose();
          }}
        >
          <ArrowRightLeft className="w-4 h-4" /> Swap Day & Month
        </button>
      )}
      {isDateColumn && <div className="h-px bg-border my-1 mx-2" />}
      <button
        className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
        onClick={() => {
          const selectedRows = new Set<number>();
          const ranges = [...multiSelections];
          if (selectionRange) ranges.push(selectionRange);
          if (ranges.length > 0) {
            for (const range of ranges) {
              for (let r = range.minRow; r <= range.maxRow; r++) {
                selectedRows.add(r);
              }
            }
          } else {
            selectedRows.add(contextMenu.rowIndex);
          }
          onAutoMapRows?.(Array.from(selectedRows), true);
          onClose();
        }}
      >
        <span className="w-4 h-4 text-xs font-bold font-mono">✨</span> Mapping data (Local & AI)
      </button>
      <button
        className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
        onClick={() => {
          const selectedRows = new Set<number>();
          const ranges = [...multiSelections];
          if (selectionRange) ranges.push(selectionRange);
          if (ranges.length > 0) {
            for (const range of ranges) {
              for (let r = range.minRow; r <= range.maxRow; r++) {
                selectedRows.add(r);
              }
            }
          } else {
            selectedRows.add(contextMenu.rowIndex);
          }
          onAutoMapRows?.(Array.from(selectedRows), false);
          onClose();
        }}
      >
        <span className="w-4 h-4 text-xs font-bold font-mono">⚡</span> Mapping data Local Only
      </button>
      <div className="h-px bg-border my-1 mx-2" />
      <button
        className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
        onClick={() => {
          handleCopyAction(contextMenu.rowIndex, contextMenu.colIndex);
          onClose();
        }}
      >
        <Copy className="w-4 h-4" /> Copy
      </button>
      <button
        className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
        onClick={() => {
          handlePasteAction();
          onClose();
        }}
      >
        <ClipboardPaste className="w-4 h-4" /> Paste
      </button>
    </div>
  );
}
