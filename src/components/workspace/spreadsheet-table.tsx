"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Copy, AlertTriangle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TransactionRow } from "@/types";
import { CategoryDropdown } from "./category-dropdown";
import { AccountDropdown } from "./account-dropdown";

interface SpreadsheetTableProps {
  data: TransactionRow[];
  onDataChange?: (data: TransactionRow[]) => void;
}

const MOCK_CATEGORIES = [
  { id: "c1", name: "Food & Beverage" },
  { id: "c2", name: "Transport" },
  { id: "c3", name: "Utilities" },
  { id: "c4", name: "Entertainment" },
];

const MOCK_ACCOUNTS = [
  { id: "a1", name: "Cash" },
  { id: "a2", name: "BCA" },
  { id: "a3", name: "Mandiri" },
];

const RECENT_ACCOUNTS = ["a1", "a3"];

export function SpreadsheetTable({ data, onDataChange }: SpreadsheetTableProps) {
  const [tableData, setTableData] = React.useState<TransactionRow[]>(data);
  const [editingCell, setEditingCell] = React.useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [rowSelection, setRowSelection] = React.useState({});

  React.useEffect(() => {
    setTableData(data);
  }, [data]);

  const columns = React.useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <div className="flex h-full w-full items-center justify-center px-2">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "item",
        header: "Item",
        cell: (info) => {
          const isDup = info.row.original.isDuplicate;
          return (
            <div className="flex items-center gap-2">
              <span>{info.getValue() as string}</span>
              {isDup && (
                <span title="Possible duplicate detected">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </span>
              )}
            </div>
          );
        },
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
        cell: (info) => {
          const val = info.getValue() as string;
          return MOCK_CATEGORIES.find((c) => c.id === val)?.name || "-";
        },
      },
      {
        accessorKey: "accountId",
        header: "Account",
        cell: (info) => {
          const val = info.getValue() as string;
          return MOCK_ACCOUNTS.find((a) => a.id === val)?.name || "-";
        },
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
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  const handleCopy = React.useCallback(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const rowsToCopy = selectedRows.length > 0 ? selectedRows : table.getRowModel().rows;
    
    if (rowsToCopy.length === 0) return;
  
    const headers = ["Date", "Item", "Amount", "Category", "Account", "Notes"];
    
    const tsvData = rowsToCopy.map((row) => {
      const t = row.original;
      const catName = MOCK_CATEGORIES.find((c) => c.id === t.categoryId)?.name || "";
      const accName = MOCK_ACCOUNTS.find((a) => a.id === t.accountId)?.name || "";
      
      return [
        t.date || "",
        t.item || "",
        t.amount?.toString() || "",
        catName,
        accName,
        t.notes || ""
      ].join("\t");
    });
  
    const finalTsv = [headers.join("\t"), ...tsvData].join("\n");
    navigator.clipboard.writeText(finalTsv).then(() => {
      // Could show a toast notification here
      console.log("Copied to clipboard!");
    });
  }, [table]);

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
      if (!["date", "item", "amount", "notes", "categoryId", "accountId"].includes(key)) return;

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
    (rowIndex: number, colIndex: number, explicitValue?: string) => {
      setEditingCell((prev) => {
        if (!prev || prev.rowIndex !== rowIndex || prev.colIndex !== colIndex) return prev;
        
        const colDef = columns[colIndex];
        if (!colDef || !("accessorKey" in colDef)) return null;
        
        const key = (colDef as any).accessorKey;
        const newData = [...tableData];
        const row = { ...newData[rowIndex] };

        const valToSave = explicitValue !== undefined ? explicitValue : editValue;

        if (key === "amount") {
          const parsed = parseFloat(valToSave.replace(/\./g, "").replace(",", "."));
          (row as any)[key] = isNaN(parsed) ? null : parsed;
        } else {
          (row as any)[key] = valToSave;
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

    const colDef = columns[colIndex];
    const isSelectCol = colDef && colDef.id === "select";
    const key = colDef && "accessorKey" in colDef ? (colDef as any).accessorKey : "";
    const isDropdown = key === "categoryId" || key === "accountId";

    if (isEditing) {
      if (isDropdown) return;

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

    let nextRow = rowIndex;
    let nextCol = colIndex;

    if (e.key === "ArrowUp") nextRow = Math.max(0, rowIndex - 1);
    else if (e.key === "ArrowDown") nextRow = Math.min(tableData.length - 1, rowIndex + 1);
    else if (e.key === "ArrowLeft") nextCol = Math.max(0, colIndex - 1);
    else if (e.key === "ArrowRight") nextCol = Math.min(columns.length - 1, colIndex + 1);
    else if (e.key === "Enter" && !isSelectCol) {
      e.preventDefault();
      startEditing(rowIndex, colIndex);
      return;
    } else if (e.key === " " && isSelectCol) {
      // Let space toggle checkbox
      return;
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isDropdown && !isSelectCol) {
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
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Spreadsheet</h2>
        <Button size="sm" variant="outline" onClick={handleCopy} disabled={tableData.length === 0}>
          <Copy className="mr-2 h-4 w-4" />
          {Object.keys(rowSelection).length > 0 ? "Copy Selected" : "Copy All"}
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <Table className="border-collapse">
          <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-md">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="border-r border-border font-semibold text-muted-foreground p-0 px-2 h-10">
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
                    const isDropdown = cell.column.id === "categoryId" || cell.column.id === "accountId";
                    const isSelectCol = cell.column.id === "select";

                    return (
                      <TableCell
                        key={cell.id}
                        className="relative border-r border-border p-0 focus-within:ring-1 focus-within:ring-primary focus-within:ring-inset"
                        tabIndex={isEditing && !isDropdown ? -1 : 0}
                        data-row-index={rowIndex}
                        data-col-index={colIndex}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                      >
                        {isEditing && cell.column.id === "accountId" ? (
                          <AccountDropdown
                            options={MOCK_ACCOUNTS}
                            recentIds={RECENT_ACCOUNTS}
                            value={editValue}
                            onSelect={(newVal) => {
                              saveEdit(rowIndex, colIndex, newVal || "");
                              focusCell(rowIndex, colIndex);
                            }}
                            onClose={() => {
                              setEditingCell(null);
                              focusCell(rowIndex, colIndex);
                            }}
                          />
                        ) : isEditing && cell.column.id === "categoryId" ? (
                          <CategoryDropdown
                            options={MOCK_CATEGORIES}
                            value={editValue}
                            onSelect={(newVal) => {
                              saveEdit(rowIndex, colIndex, newVal || "");
                              focusCell(rowIndex, colIndex);
                            }}
                            onClose={() => {
                              setEditingCell(null);
                              focusCell(rowIndex, colIndex);
                            }}
                          />
                        ) : isEditing ? (
                          <input
                            autoFocus
                            className="h-full w-full bg-transparent px-2 py-2 outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveEdit(rowIndex, colIndex)}
                          />
                        ) : (
                          <div
                            className={`min-h-[40px] ${isSelectCol ? '' : 'px-2 py-2 cursor-text'} focus:outline-none focus:bg-primary/10`}
                            onDoubleClick={() => {
                              if (!isSelectCol) startEditing(rowIndex, colIndex);
                            }}
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
