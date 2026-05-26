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
import { CategoryOption, AccountOption, TransactionRow } from "@/types";
import { CategoryDropdown } from "./category-dropdown";
import { AccountDropdown } from "./account-dropdown";

interface SpreadsheetTableProps {
  data: TransactionRow[];
  categories: CategoryOption[];
  accounts: AccountOption[];
  onDataChange?: (data: TransactionRow[]) => void;
}

interface CellPos {
  rowIndex: number;
  colIndex: number;
}

const RECENT_ACCOUNTS: string[] = [];

export function SpreadsheetTable({ data, categories, accounts, onDataChange }: SpreadsheetTableProps) {
  const [tableData, setTableData] = React.useState<TransactionRow[]>(data);
  const [editingCell, setEditingCell] = React.useState<CellPos | null>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [rowSelection, setRowSelection] = React.useState({});

  // Cell range selection (like Google Sheets)
  const [selectionAnchor, setSelectionAnchor] = React.useState<CellPos | null>(null);
  const [selectionFocus, setSelectionFocus] = React.useState<CellPos | null>(null);
  const [copyFlash, setCopyFlash] = React.useState(false);
  const isDragging = React.useRef(false);

  React.useEffect(() => {
    setTableData(data);
  }, [data]);

  // Compute selection rectangle
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
      if (!selectionRange) return false;
      return (
        rowIndex >= selectionRange.minRow &&
        rowIndex <= selectionRange.maxRow &&
        colIndex >= selectionRange.minCol &&
        colIndex <= selectionRange.maxCol
      );
    },
    [selectionRange]
  );

  const getCellValue = React.useCallback(
    (row: TransactionRow, colKey: string): string => {
      if (colKey === "categoryId") return categories.find((c) => c.id === row.categoryId)?.name || "";
      if (colKey === "accountId") return accounts.find((a) => a.id === row.accountId)?.name || "";
      if (colKey === "amount") return row.amount !== null && row.amount !== undefined ? row.amount.toString() : "";
      return String((row as any)[colKey] ?? "");
    },
    [categories, accounts]
  );

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
          return categories.find((c) => c.id === val)?.name || "-";
        },
      },
      {
        accessorKey: "accountId",
        header: "Account",
        cell: (info) => {
          const val = info.getValue() as string;
          return accounts.find((a) => a.id === val)?.name || "-";
        },
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: (info) => info.getValue() || "",
      },
    ],
    [categories, accounts]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  // Copy selection range as TSV
  const copySelectionToClipboard = React.useCallback(() => {
    if (!selectionRange) return;

    const rows = table.getRowModel().rows;
    const sanitize = (s: string) => s.replace(/[\t\n\r]/g, " ");

    const tsv: string[] = [];
    for (let r = selectionRange.minRow; r <= selectionRange.maxRow; r++) {
      const row = rows[r];
      if (!row) continue;
      const rowValues: string[] = [];
      for (let c = selectionRange.minCol; c <= selectionRange.maxCol; c++) {
        const colDef = columns[c];
        const key = colDef && "accessorKey" in colDef ? (colDef as any).accessorKey : null;
        if (!key) {
          rowValues.push("");
          continue;
        }
        rowValues.push(sanitize(getCellValue(row.original, key)));
      }
      tsv.push(rowValues.join("\t"));
    }

    navigator.clipboard.writeText(tsv.join("\n")).then(() => {
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 600);
    });
  }, [selectionRange, table, columns, getCellValue]);

  // Copy All / Copy Selected Rows button
  const handleCopyRows = React.useCallback(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const rowsToCopy = selectedRows.length > 0 ? selectedRows : table.getRowModel().rows;
    if (rowsToCopy.length === 0) return;

    const headers = ["Date", "Item", "Amount", "Category", "Account", "Notes"];
    const sanitize = (s: string) => s.replace(/[\t\n\r]/g, " ");

    const tsvData = rowsToCopy.map((row) => {
      const t = row.original;
      return [
        sanitize(t.date || ""),
        sanitize(t.item || ""),
        t.amount !== null && t.amount !== undefined ? t.amount.toString() : "",
        sanitize(categories.find((c) => c.id === t.categoryId)?.name || ""),
        sanitize(accounts.find((a) => a.id === t.accountId)?.name || ""),
        sanitize(t.notes || ""),
      ].join("\t");
    });

    const finalTsv = [headers.join("\t"), ...tsvData].join("\n");
    navigator.clipboard.writeText(finalTsv).then(() => {
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 600);
    });
  }, [table, categories, accounts]);

  const focusCell = React.useCallback((row: number, col: number) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-row-index="${row}"][data-col-index="${col}"]`) as HTMLElement;
      el?.focus();
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

  // Mouse handlers for drag-selection
  const handleCellMouseDown = (e: React.MouseEvent, rowIndex: number, colIndex: number, isSelectCol: boolean) => {
    if (isSelectCol) return;
    if (editingCell) return;
    // Prevent text selection in the browser while dragging across cells
    e.preventDefault();

    if (e.shiftKey && selectionAnchor) {
      // Extend current selection
      setSelectionFocus({ rowIndex, colIndex });
    } else {
      // Start new selection
      setSelectionAnchor({ rowIndex, colIndex });
      setSelectionFocus({ rowIndex, colIndex });
    }

    isDragging.current = true;
  };

  const handleCellMouseEnter = (rowIndex: number, colIndex: number, isSelectCol: boolean) => {
    if (!isDragging.current || isSelectCol) return;
    setSelectionFocus({ rowIndex, colIndex });
  };

  React.useEffect(() => {
    const stopDrag = () => { isDragging.current = false; };
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

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
        focusCell(rowIndex, Math.min(columns.length - 1, colIndex + 1));
      }
      return;
    }

    // Ctrl+C: copy selection range (or single cell if no range)
    if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (selectionRange) {
        copySelectionToClipboard();
      } else if (!isSelectCol) {
        // No range selection — copy single focused cell
        const row = tableData[rowIndex];
        if (row && key) {
          navigator.clipboard.writeText(getCellValue(row, key)).then(() => {
            setCopyFlash(true);
            setTimeout(() => setCopyFlash(false), 600);
          });
        }
      }
      return;
    }

    let nextRow = rowIndex;
    let nextCol = colIndex;

    const isShift = e.shiftKey;

    if (e.key === "ArrowUp") { e.preventDefault(); nextRow = Math.max(0, rowIndex - 1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); nextRow = Math.min(tableData.length - 1, rowIndex + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); nextCol = Math.max(0, colIndex - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); nextCol = Math.min(columns.length - 1, colIndex + 1); }
    else if (e.key === "Enter" && !isSelectCol) { e.preventDefault(); startEditing(rowIndex, colIndex); return; }
    else if (e.key === " " && isSelectCol) { return; }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isDropdown && !isSelectCol) {
      startEditing(rowIndex, colIndex, e.key);
      e.preventDefault();
      return;
    } else {
      return;
    }

    if (nextRow !== rowIndex || nextCol !== colIndex) {
      if (isShift) {
        // Extend selection with Shift+Arrow
        if (!selectionAnchor) setSelectionAnchor({ rowIndex, colIndex });
        setSelectionFocus({ rowIndex: nextRow, colIndex: nextCol });
      } else {
        // Move selection anchor
        setSelectionAnchor({ rowIndex: nextRow, colIndex: nextCol });
        setSelectionFocus({ rowIndex: nextRow, colIndex: nextCol });
      }
      focusCell(nextRow, nextCol);
    }
  };

  const isAnySingleCellSelected = selectionAnchor &&
    selectionFocus &&
    selectionAnchor.rowIndex === selectionFocus.rowIndex &&
    selectionAnchor.colIndex === selectionFocus.colIndex;

  const selectionLabel = selectionRange && !isAnySingleCellSelected
    ? `${(selectionRange.maxRow - selectionRange.minRow + 1)}R × ${(selectionRange.maxCol - selectionRange.minCol + 1)}C selected`
    : null;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Spreadsheet</h2>
          {selectionLabel && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{selectionLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectionRange && !isAnySingleCellSelected && (
            <Button
              size="sm"
              variant="default"
              onClick={copySelectionToClipboard}
              className={copyFlash ? "bg-green-600" : ""}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Selection
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleCopyRows} disabled={tableData.length === 0}
            className={copyFlash && (!selectionRange || isAnySingleCellSelected) ? "bg-green-600/10 border-green-600 text-green-600" : ""}
          >
            <Copy className="mr-2 h-4 w-4" />
            {Object.keys(rowSelection).length > 0 ? "Copy Selected Rows" : "Copy All Rows"}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto" onMouseLeave={() => { isDragging.current = false; }}>
        <Table className="border-collapse">
          <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-md">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, colIndex) => (
                  <TableHead
                    key={header.id}
                    className="border-r border-border font-semibold text-muted-foreground p-0 px-2 h-10 select-none"
                    onClick={() => {
                      // Click on column header → select entire column
                      const colDef = columns[colIndex];
                      if (colDef?.id === "select") return;
                      const lastRow = tableData.length - 1;
                      if (lastRow < 0) return;
                      setSelectionAnchor({ rowIndex: 0, colIndex });
                      setSelectionFocus({ rowIndex: lastRow, colIndex });
                      focusCell(0, colIndex);
                    }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                    const selected = !isSelectCol && isCellSelected(rowIndex, colIndex);

                    return (
                      <TableCell
                        key={cell.id}
                        className={[
                          "relative border-r border-border p-0 transition-colors",
                          isEditing ? "ring-1 ring-primary ring-inset z-10" : "",
                          selected && !isEditing ? "bg-blue-500/20 outline outline-1 outline-blue-400" : "",
                          !selected && !isEditing ? "focus-within:ring-1 focus-within:ring-primary focus-within:ring-inset" : "",
                        ].join(" ")}
                        tabIndex={isEditing && !isDropdown ? -1 : 0}
                        data-row-index={rowIndex}
                        data-col-index={colIndex}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        onMouseDown={(e) => handleCellMouseDown(e, rowIndex, colIndex, isSelectCol)}
                        onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex, isSelectCol)}
                        onFocus={() => {
                          if (!isDragging.current && !editingCell) {
                            setSelectionAnchor({ rowIndex, colIndex });
                            setSelectionFocus({ rowIndex, colIndex });
                          }
                        }}
                      >
                        {isEditing && cell.column.id === "accountId" ? (
                          <AccountDropdown
                            options={accounts}
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
                            options={categories}
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
                            className={`min-h-[40px] ${isSelectCol ? "" : "px-2 py-2 cursor-default select-none"}`}
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
