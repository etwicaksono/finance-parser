"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionRow } from "@/types";

interface SpreadsheetTableProps {
  data: TransactionRow[];
  onDataChange?: (data: TransactionRow[]) => void;
}

export function SpreadsheetTable({ data, onDataChange }: SpreadsheetTableProps) {
  const [tableData, setTableData] = React.useState<TransactionRow[]>(data);
  const [editingCell, setEditingCell] = React.useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [editValue, setEditValue] = React.useState<string>("");

  // Sync prop data to local state
  React.useEffect(() => {
    setTableData(data);
  }, [data]);

  const columns = React.useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "item",
        header: "Item",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: (info) => {
          const val = info.getValue() as number | null;
          return val !== null ? val.toLocaleString("id-ID") : "";
        },
      },
      {
        accessorKey: "categoryId",
        header: "Category",
        cell: (info) => info.getValue() || "-", // Placeholder until TASK-016 Dropdown
      },
      {
        accessorKey: "accountId",
        header: "Account",
        cell: (info) => info.getValue() || "-",
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: (info) => info.getValue() || "",
      },
    ],
    []
  );

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const focusCell = React.useCallback((row: number, col: number) => {
    setTimeout(() => {
      const targetCell = document.querySelector(`[data-row-index="${row}"][data-col-index="${col}"]`) as HTMLElement;
      if (targetCell) {
        targetCell.focus();
      }
    }, 0);
  }, []);

  const startEditing = React.useCallback(
    (rowIndex: number, colIndex: number, initialValue?: string) => {
      const colDef = columns[colIndex];
      if (!colDef || !("accessorKey" in colDef)) return;

      const key = (colDef as any).accessorKey;
      if (!["date", "item", "amount", "notes"].includes(key)) return;

      setEditingCell({ rowIndex, colIndex });

      if (initialValue !== undefined) {
        setEditValue(initialValue);
      } else {
        const row = tableData[rowIndex];
        const val = (row as any)[key];
        setEditValue(val !== null && val !== undefined ? String(val) : "");
      }
    },
    [columns, tableData]
  );

  const saveEdit = React.useCallback(
    (rowIndex: number, colIndex: number) => {
      // Use the functional state update or refs to avoid stale closures,
      // but since we only save what's in `editValue`, it should be fine.
      setEditingCell((prev) => {
        if (!prev || prev.rowIndex !== rowIndex || prev.colIndex !== colIndex) return prev;
        
        const colDef = columns[colIndex];
        if (!colDef || !("accessorKey" in colDef)) return null;
        
        const key = (colDef as any).accessorKey;
        const newData = [...tableData];
        const row = { ...newData[rowIndex] };

        if (key === "amount") {
          const parsed = parseFloat(editValue.replace(/\./g, "").replace(",", "."));
          (row as any)[key] = isNaN(parsed) ? null : parsed;
        } else {
          (row as any)[key] = editValue;
        }

        newData[rowIndex] = row as TransactionRow;
        setTableData(newData);
        onDataChange?.(newData);
        
        return null;
      });
    },
    [columns, editValue, tableData, onDataChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableCellElement>, rowIndex: number, colIndex: number) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex;

    if (isEditing) {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit(rowIndex, colIndex);
        const nextRow = Math.min(tableData.length - 1, rowIndex + 1);
        focusCell(nextRow, colIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditingCell(null);
        focusCell(rowIndex, colIndex);
      } else if (e.key === "Tab") {
        e.preventDefault();
        saveEdit(rowIndex, colIndex);
        const nextCol = Math.min(columns.length - 1, colIndex + 1);
        focusCell(rowIndex, nextCol);
      }
      return;
    }

    // Normal navigation
    let nextRow = rowIndex;
    let nextCol = colIndex;

    if (e.key === "ArrowUp") nextRow = Math.max(0, rowIndex - 1);
    else if (e.key === "ArrowDown") nextRow = Math.min(tableData.length - 1, rowIndex + 1);
    else if (e.key === "ArrowLeft") nextCol = Math.max(0, colIndex - 1);
    else if (e.key === "ArrowRight") nextCol = Math.min(columns.length - 1, colIndex + 1);
    else if (e.key === "Enter") {
      e.preventDefault();
      startEditing(rowIndex, colIndex);
      return;
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      startEditing(rowIndex, colIndex, e.key);
      e.preventDefault();
      return;
    } else {
      return;
    }

    e.preventDefault();
    focusCell(nextRow, nextCol);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-auto">
        <Table className="border-collapse">
          <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-md">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="border-r border-border font-semibold text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell, colIndex) => {
                    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex;

                    return (
                      <TableCell
                        key={cell.id}
                        className="border-r border-border p-0 focus-within:ring-1 focus-within:ring-primary focus-within:ring-inset"
                        tabIndex={isEditing ? -1 : 0}
                        data-row-index={rowIndex}
                        data-col-index={colIndex}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            className="h-full w-full bg-transparent px-2 py-2 outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveEdit(rowIndex, colIndex)}
                          />
                        ) : (
                          <div
                            className="min-h-[40px] px-2 py-2 cursor-text focus:outline-none focus:bg-primary/10"
                            onDoubleClick={() => startEditing(rowIndex, colIndex)}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No data. Paste WhatsApp chat to begin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
