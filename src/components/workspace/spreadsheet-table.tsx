"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Copy, AlertTriangle, Plus, Trash2, Check, Trash } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getCategorySign } from "@/features/validation/category-sign";
import { CategoryOption, AccountOption, TransactionRow } from "@/types";
import { CategoryDropdown } from "./category-dropdown";
import { AccountDropdown } from "./account-dropdown";
import { FloatingEditor } from "./floating-editor";

interface SpreadsheetTableProps {
  data: TransactionRow[];
  categories: CategoryOption[];
  accounts: AccountOption[];
  viewMode?: "raw" | "grouped";
  onDataChange?: (data: TransactionRow[]) => void;
  onEditGroupedItems?: (row: TransactionRow) => void;
  onCategoryChange?: (rowId: string, itemString: string, newCategoryId: string) => void;
  onCopyRows?: (rows: TransactionRow[]) => void;
  onResolveDuplicate?: (rowIndex: number, action: "keep" | "remove") => void;
  emptyMessage?: string;
}

interface CellPos {
  rowIndex: number;
  colIndex: number;
}

const RECENT_ACCOUNTS: string[] = [];

export function SpreadsheetTable({ data, categories, accounts, viewMode = "raw", onDataChange, onEditGroupedItems, onCategoryChange, onCopyRows, onResolveDuplicate, emptyMessage = "No data available." }: SpreadsheetTableProps) {
  const tableId = React.useId().replace(/:/g, "");
  const [tableData, setTableData] = React.useState<TransactionRow[]>(data);
  const [editingCell, setEditingCell] = React.useState<CellPos | null>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [rowSelection, setRowSelection] = React.useState({});
  const [includeHeader, setIncludeHeader] = React.useState(true);

  const insertRowBelow = React.useCallback((index: number) => {
    setTableData(prev => {
      const newData = [...prev];
      const sourceRow = newData[index];
      const newRow: TransactionRow = {
        id: crypto.randomUUID(),
        date: sourceRow ? sourceRow.date : "",
        item: "",
        amount: null,
        categoryId: null,
        accountId: sourceRow ? sourceRow.accountId : null,
        notes: "",
      };
      newData.splice(index + 1, 0, newRow);
      onDataChange?.(newData);
      return newData;
    });
  }, [onDataChange]);

  const deleteRow = React.useCallback((index: number) => {
    setTableData(prev => {
      const newData = [...prev];
      newData.splice(index, 1);
      onDataChange?.(newData);
      return newData;
    });
  }, [onDataChange]);

  // Cell range selection (like Google Sheets)
  const [selectionAnchor, setSelectionAnchor] = React.useState<CellPos | null>(null);
  const [selectionFocus, setSelectionFocus] = React.useState<CellPos | null>(null);
  const [copyFlash, setCopyFlash] = React.useState(false);
  const isDragging = React.useRef(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const autoScrollInterval = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setTableData(data);
  }, [data]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) {
        if (autoScrollInterval.current) {
          clearInterval(autoScrollInterval.current);
          autoScrollInterval.current = null;
        }
        return;
      }

      const container = scrollContainerRef.current?.querySelector(".table-scroll-container");
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY;
      const threshold = 50; // pixels from edge to start scrolling
      let scrollSpeed = 0;

      if (y < rect.top + threshold) {
        scrollSpeed = -15; // scroll up
      } else if (y > rect.bottom - threshold) {
        scrollSpeed = 15; // scroll down
      }

      if (scrollSpeed !== 0) {
        if (!autoScrollInterval.current) {
          autoScrollInterval.current = setInterval(() => {
            if (!isDragging.current) {
              if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
              autoScrollInterval.current = null;
              return;
            }
            container.scrollBy(0, scrollSpeed);

            // Find cell under cursor to update selection
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el) {
              const cell = el.closest("td");
              if (cell) {
                const rIdx = parseInt(cell.getAttribute("data-row-index") || "-1");
                const cIdx = parseInt(cell.getAttribute("data-col-index") || "-1");
                if (rIdx >= 0 && cIdx >= 0) {
                  setSelectionFocus({ rowIndex: rIdx, colIndex: cIdx });
                }
              }
            }
          }, 20);
        }
      } else {
        if (autoScrollInterval.current) {
          clearInterval(autoScrollInterval.current);
          autoScrollInterval.current = null;
        }
      }
    };

    const stopDrag = () => {
      isDragging.current = false;
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
    };
  }, []);

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
        accessorKey: "accountId",
        header: "Account",
        cell: (info) => {
          const val = info.getValue() as string;
          return accounts.find((a) => a.id === val)?.name || "-";
        },
      },
      {
        accessorKey: "categoryId",
        header: "Category",
        cell: (info) => {
          const row = info.row.original;
          const val = info.getValue() as string;
          return categories.find((c) => c.id === val)?.name || "-";
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
        accessorKey: "item",
        header: "Item",
        cell: (info) => {
          const row = info.row.original;
          const isDup = row.isDuplicate;
          return (
            <div className="flex items-center gap-2">
              <span className={viewMode === "grouped" ? "text-blue-600 hover:underline cursor-pointer" : ""} onClick={() => {
                if (viewMode === "grouped" && onEditGroupedItems) {
                  onEditGroupedItems(row);
                }
              }}>
                {info.getValue() as string}
              </span>
              {isDup && (
                <Popover>
                  <PopoverTrigger
                    render={
                      <button className="flex items-center justify-center p-1 rounded hover:bg-muted transition-colors text-destructive" title="Resolve possible duplicate">
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                    }
                  />
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="flex flex-col space-y-2">
                      <span className="text-sm font-medium px-2 py-1">Handle Duplicate</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => onResolveDuplicate?.(info.row.index, "keep")}
                      >
                        <Check className="h-4 w-4 mr-2" /> Keep as Multiple
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onResolveDuplicate?.(info.row.index, "remove")}
                      >
                        <Trash className="h-4 w-4 mr-2" /> Remove Item
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: (info) => info.getValue() || "",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex h-full w-full items-center justify-center gap-2 px-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-primary/20"
              onClick={() => insertRowBelow(row.index)}
              title="Add row below"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/20"
              onClick={() => deleteRow(row.index)}
              title="Delete row"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [categories, accounts, insertRowBelow, deleteRow]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  // Calculate sum for selected numeric cells (Google Sheets style)
  const selectionStats = React.useMemo(() => {
    if (!selectionRange) return null;
    const { minRow, maxRow, minCol, maxCol } = selectionRange;
    
    let sum = 0;
    let count = 0;
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
         const colDef = columns[c];
         const key = colDef && "accessorKey" in colDef ? (colDef as any).accessorKey : null;
         if (key === "amount") {
            const val = tableData[r]?.amount;
            if (typeof val === 'number') {
              sum += val;
              count++;
            }
         }
      }
    }
    
    if (count <= 1) return null;
    return { sum, count };
  }, [selectionRange, tableData, columns]);

  // Copy selection range as TSV
  const copySelectionToClipboard = React.useCallback(() => {
    if (!selectionRange) return;

    const rows = table.getRowModel().rows;
    const sanitize = (s: string) => {
      if (s.includes("\n") || s.includes("\r") || s.includes("\t") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const tsv: string[] = [];
    const copiedOriginals: TransactionRow[] = [];
    for (let r = selectionRange.minRow; r <= selectionRange.maxRow; r++) {
      const row = rows[r];
      if (!row) continue;
      copiedOriginals.push(row.original);
      const rowValues: string[] = [];
      for (let c = selectionRange.minCol; c <= selectionRange.maxCol; c++) {
        const colDef = columns[c];
        const key = colDef && "accessorKey" in colDef ? (colDef as any).accessorKey : null;
        if (key === "notes") continue;
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
      
      if (onCopyRows) {
        onCopyRows(copiedOriginals);
      }
    });
  }, [selectionRange, table, columns, getCellValue, onCopyRows]);

  // Copy All / Copy Selected Rows button
  const handleCopyRows = React.useCallback(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const rowsToCopy = selectedRows.length > 0 ? selectedRows : table.getRowModel().rows;
    if (rowsToCopy.length === 0) return;

    const headers = ["Date", "Account", "Category", "Amount", "Item"];
    const sanitize = (s: string) => {
      if (s.includes("\n") || s.includes("\r") || s.includes("\t") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const tsvData = rowsToCopy.map((row) => {
      const t = row.original;
      return [
        sanitize(t.date || ""),
        sanitize(accounts.find((a) => a.id === t.accountId)?.name || ""),
        sanitize(categories.find((c) => c.id === t.categoryId)?.name || ""),
        t.amount !== null && t.amount !== undefined ? t.amount.toString() : "",
        sanitize(t.item || ""),
      ].join("\t");
    });

    const finalTsv = includeHeader ? [headers.join("\t"), ...tsvData].join("\n") : tsvData.join("\n");
    navigator.clipboard.writeText(finalTsv).then(() => {
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 600);
      if (onCopyRows) {
        onCopyRows(rowsToCopy.map((r) => r.original));
      }
    });
  }, [table, categories, accounts, onCopyRows, includeHeader]);

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

      const row = tableData[rowIndex];
      if (!row) return;

      if (viewMode === "grouped" && key === "item") {
        if (onEditGroupedItems) {
          onEditGroupedItems(row);
        }
        return;
      }

      setEditingCell({ rowIndex, colIndex });
      if (initialValue !== undefined) {
        setEditValue(initialValue);
      } else {
        const val = row[key as keyof TransactionRow];
        setEditValue(val !== null && val !== undefined ? String(val) : "");
      }
    },
    [columns, tableData, viewMode, onEditGroupedItems]
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
        } else if (key === "categoryId") {
          const oldVal = (row as any)[key];
          (row as any)[key] = valToSave;
          if (oldVal !== valToSave && valToSave) {
            onCategoryChange?.(row.id as string, row.item as string, valToSave as string);
          }
          // If category is manually edited, auto-adjust the amount sign
          if (typeof row.amount === "number") {
            const catName = categories.find((c) => c.id === valToSave)?.name;
            if (catName) {
              const sign = getCategorySign(catName);
              if (sign === "income") row.amount = Math.abs(row.amount);
              else if (sign === "expense") row.amount = -Math.abs(row.amount);
            }
          }
        } else if (key === "item") {
          (row as any)[key] = valToSave;
          let sum = 0;
          let hasPrice = false;
          valToSave.split("\n").forEach((line: string) => {
            const match = line.match(/=>\s*([\d\.]+)k?/i);
            if (match && match[1]) {
              hasPrice = true;
              const val = parseFloat(match[1]);
              sum += line.toLowerCase().includes("k") ? val * 1000 : val;
            }
          });
          if (hasPrice) {
            const currentSign = (row.amount ?? -1) < 0 ? -1 : 1;
            (row as any).amount = sum * currentSign;
          }
        } else {
          (row as any)[key] = valToSave;
        }
        newData[rowIndex] = row as TransactionRow;
        setTableData(newData);
        onDataChange?.(newData);
        return null;
      });
    },
    [columns, editValue, tableData, onDataChange, onCategoryChange]
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
    <div className="flex flex-1 min-h-0 flex-col bg-background">
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
          <div className="flex items-center space-x-2 mr-2">
            <Checkbox
              id="include-header"
              checked={includeHeader}
              onCheckedChange={(checked) => setIncludeHeader(checked as boolean)}
            />
            <label
              htmlFor="include-header"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
            >
              Include header
            </label>
          </div>
          <Button size="sm" variant="outline" onClick={handleCopyRows} disabled={tableData.length === 0}
            className={copyFlash && (!selectionRange || isAnySingleCellSelected) ? "bg-green-600/10 border-green-600 text-green-600" : ""}
          >
            <Copy className="mr-2 h-4 w-4" />
            {Object.keys(rowSelection).length > 0 ? "Copy Selected Rows" : "Copy All Rows"}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative" ref={scrollContainerRef}>
        <Table className="border-collapse" containerClassName="absolute inset-0 overflow-auto pb-32 table-scroll-container">
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
                        id={`cell-${tableId}-${rowIndex}-${colIndex}`}
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
                        ) : isEditing && cell.column.id === "date" ? (
                          <input
                            type="date"
                            ref={(el) => {
                              if (el && !el.dataset.pickerOpened) {
                                el.dataset.pickerOpened = "true";
                                el.focus();
                                try {
                                  el.showPicker();
                                } catch (err) {}
                              }
                            }}
                            className="h-full w-full bg-transparent px-2 py-2 outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveEdit(rowIndex, colIndex)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.stopPropagation();
                                e.preventDefault();
                                saveEdit(rowIndex, colIndex);
                                const nextRow = Math.min(tableData.length - 1, rowIndex + 1);
                                focusCell(nextRow, colIndex);
                              }
                            }}
                          />
                        ) : (
                          <>
                            <div
                              className={`min-h-[40px] whitespace-pre-wrap ${isSelectCol ? "" : "px-2 py-2 cursor-default select-none"} ${isEditing ? "opacity-0" : ""}`}
                              onDoubleClick={() => {
                                if (!isSelectCol) startEditing(rowIndex, colIndex);
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                            {isEditing && (
                              <FloatingEditor
                                initialValue={editValue}
                                targetCellId={`cell-${tableId}-${rowIndex}-${colIndex}`}
                                onSave={(val) => saveEdit(rowIndex, colIndex, val)}
                                onCancel={() => {
                                  setEditingCell(null);
                                  focusCell(rowIndex, colIndex);
                                }}
                                onNextRow={(val) => {
                                  saveEdit(rowIndex, colIndex, val);
                                  const nextRow = Math.min(tableData.length - 1, rowIndex + 1);
                                  focusCell(nextRow, colIndex);
                                }}
                              />
                            )}
                          </>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Floating Status Bar (like Google Sheets) */}
      {selectionStats && (
        <div className="absolute bottom-6 right-6 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-full shadow-lg font-medium flex gap-3 items-center z-50 animate-in fade-in slide-in-from-bottom-2 pointer-events-none">
          <span>Sum: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(selectionStats.sum)}</span>
          <span className="text-primary-foreground/70 text-xs">({selectionStats.count} cells)</span>
        </div>
      )}
    </div>
  );
}
