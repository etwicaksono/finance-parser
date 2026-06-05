"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Copy, AlertTriangle, Plus, Trash2, Check, Trash, ClipboardPaste, ArrowUp, ArrowDown, ArrowUpDown, CalendarCheck, ArrowRightLeft } from "lucide-react";
import Swal from "sweetalert2";

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
  contraKeywords?: string[];
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

export function SpreadsheetTable({ data, categories, accounts, contraKeywords = [], viewMode = "raw", onDataChange, onEditGroupedItems, onCategoryChange, onCopyRows, onResolveDuplicate, emptyMessage = "No data available." }: SpreadsheetTableProps) {
  const tableId = React.useId().replace(/:/g, "");
  const [tableData, setTableData] = React.useState<TransactionRow[]>(data);
  const [editingCell, setEditingCell] = React.useState<CellPos | null>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
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
  const isKeyboardNavigating = React.useRef(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const autoScrollInterval = React.useRef<NodeJS.Timeout | null>(null);
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, rowIndex: number, colIndex: number } | null>(null);

  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setContextMenu(null);
    });
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

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
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                column.toggleSorting(isSorted === "asc");
              }}
              className="flex items-center p-0 h-10 w-full justify-start rounded-none hover:bg-transparent px-2 -mx-2"
            >
              Date
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              )}
            </Button>
          );
        },
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <span className={row.isDateAmbiguous ? "font-bold text-yellow-600 dark:text-yellow-500" : ""}>
                {info.getValue() as string}
              </span>
              {row.isDateAmbiguous && (
                <span title="Ambiguous Date Format. Right click to swap Day and Month.">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                </span>
              )}
            </div>
          );
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
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    enableSortingRemoval: true,
    state: { rowSelection, sorting },
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
    isKeyboardNavigating.current = true;
    setTimeout(() => {
      const el = document.querySelector(`[data-row-index="${row}"][data-col-index="${col}"]`) as HTMLElement;
      el?.focus();
      setTimeout(() => {
        isKeyboardNavigating.current = false;
      }, 50);
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

  const applyCellUpdate = React.useCallback((row: TransactionRow, key: string, valToSave: string) => {
    if (key === "amount") {
      const parsed = parseFloat(valToSave.replace(/\./g, "").replace(",", "."));
      (row as any)[key] = isNaN(parsed) ? null : parsed;
    } else if (key === "categoryId") {
      const matched = categories.find(c => c.name.toLowerCase() === valToSave.toLowerCase() || c.id === valToSave);
      const oldVal = (row as any)[key];
      const newVal = matched ? matched.id : null;
      (row as any)[key] = newVal;
      
      if (oldVal !== newVal && newVal) {
        onCategoryChange?.(row.id as string, row.item as string, newVal);
      }
      
      // If category is manually edited, auto-adjust the amount sign
      if (typeof row.amount === "number") {
        const catName = categories.find((c) => c.id === newVal)?.name;
        if (catName) {
          const sign = getCategorySign(catName);
          const isContraItem = contraKeywords.some(kw => (row.item as string).toLowerCase().includes(kw.toLowerCase()));
          
          if (sign === "income") row.amount = Math.abs(row.amount);
          else if (sign === "expense") {
            if (!(isContraItem && row.amount > 0)) {
               row.amount = -Math.abs(row.amount);
            }
          }
        }
      }
    } else if (key === "accountId") {
      const matched = accounts.find(c => c.name.toLowerCase() === valToSave.toLowerCase() || c.id === valToSave);
      (row as any)[key] = matched ? matched.id : null;
    } else if (key === "item") {
      (row as any)[key] = valToSave;
      let sum = 0;
      let hasPrice = false;
      valToSave.split("\n").forEach((line: string) => {
        const match = line.match(/=>\s*([\d\.]+)k?/i);
        if (match && match[1]) {
          hasPrice = true;
          const val = parseFloat(match[1]);
          const rawPrice = line.toLowerCase().includes("k") ? val * 1000 : val;
          const isContraItem = contraKeywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()));
          if (isContraItem) {
             sum -= rawPrice;
          } else {
             sum += rawPrice;
          }
        }
      });
      if (hasPrice) {
        const currentSign = (row.amount ?? -1) < 0 ? -1 : 1;
        (row as any).amount = sum * currentSign;
      }
    } else {
      (row as any)[key] = valToSave;
    }
  }, [categories, accounts, onCategoryChange]);

  const saveEdit = React.useCallback(
    (rowIndex: number, colIndex: number, explicitValue?: string) => {
      setEditingCell((prev) => {
        if (!prev || prev.rowIndex !== rowIndex || prev.colIndex !== colIndex) return prev;
        const colDef = columns[colIndex];
        if (!colDef || !("accessorKey" in colDef)) return null;
        const key = (colDef as any).accessorKey;
        const newData = [...tableData];
        const rowData = table.getRowModel().rows[rowIndex];
        const origIndex = rowData ? rowData.index : rowIndex;
        const row = { ...newData[origIndex] } as TransactionRow;
        const valToSave = explicitValue !== undefined ? explicitValue : editValue;
        
        applyCellUpdate(row, key, valToSave);
        
        newData[origIndex] = row as TransactionRow;
        setTableData(newData);
        onDataChange?.(newData);
        return null;
      });
    },
    [columns, editValue, tableData, applyCellUpdate, onDataChange, table]
  );

  // Mouse handlers for drag-selection
  const handleCellMouseDown = (e: React.MouseEvent, rowIndex: number, colIndex: number, isSelectCol: boolean) => {
    if (isSelectCol) return;
    if (editingCell) return;
    
    if (e.button === 2) return; // Let onContextMenu handle right clicks

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

    focusCell(rowIndex, colIndex);
    isDragging.current = true;
  };

  const handleCellMouseEnter = (rowIndex: number, colIndex: number, isSelectCol: boolean) => {
    if (!isDragging.current || isSelectCol) return;
    setSelectionFocus({ rowIndex, colIndex });
    focusCell(rowIndex, colIndex);
  };

  const processPasteData = React.useCallback(
    (clipboardText: string) => {
      if (editingCell) return;

      const parsedRows = clipboardText.split(/\r?\n/).map(row => row.split("\t"));
      const lastRow = parsedRows[parsedRows.length - 1];
      if (lastRow && lastRow.length === 1 && lastRow[0] === "") {
        parsedRows.pop();
      }
      if (parsedRows.length === 0) return;

      let startRow = selectionAnchor?.rowIndex ?? 0;
      let startCol = selectionAnchor?.colIndex ?? 0;
      
      const isSingleValuePaste = parsedRows.length === 1 && parsedRows[0]?.length === 1;

      setTableData(prev => {
        const newData = [...prev];
        
        // Behavior 1: Pasting single value into a larger selected range (fill range)
        if (isSingleValuePaste && selectionRange && (selectionRange.minRow !== selectionRange.maxRow || selectionRange.minCol !== selectionRange.maxCol)) {
           const val = parsedRows[0]?.[0] || "";
           for (let r = selectionRange.minRow; r <= selectionRange.maxRow; r++) {
             const rowData = table.getRowModel().rows[r];
             const origIndex = rowData ? rowData.index : r;
             const row = { ...newData[origIndex] } as TransactionRow;
             let rowChanged = false;
             for (let c = selectionRange.minCol; c <= selectionRange.maxCol; c++) {
               const colDef = columns[c];
               if (colDef && "accessorKey" in colDef) {
                 const key = (colDef as any).accessorKey;
                 if (key !== "select" && key !== "actions") {
                   applyCellUpdate(row, key, val);
                   rowChanged = true;
                 }
               }
             }
             if (rowChanged) newData[origIndex] = row;
           }
        } 
        // Behavior 2: Pasting standard multiline/multicol data starting at anchor
        else {
           for (let r = 0; r < parsedRows.length; r++) {
             const targetRow = startRow + r;
             if (targetRow >= newData.length) {
               // Optional: expand rows if needed
               const sourceRow = newData[newData.length - 1];
               newData.push({
                 id: crypto.randomUUID(),
                 date: sourceRow ? sourceRow.date : "",
                 item: "",
                 amount: null,
                 categoryId: null,
                 accountId: sourceRow ? sourceRow.accountId : null,
                 notes: "",
               });
             }
             
             const rowData = table.getRowModel().rows[targetRow];
             const origIndex = rowData ? rowData.index : newData.length - 1;
             const row = { ...newData[origIndex] } as TransactionRow;
             let rowChanged = false;
             const currentRow = parsedRows[r];
             if (!currentRow) continue;
             
             for (let c = 0; c < currentRow.length; c++) {
               const targetCol = startCol + c;
               if (targetCol >= columns.length) continue;
               const colDef = columns[targetCol];
               if (colDef && "accessorKey" in colDef) {
                 const key = (colDef as any).accessorKey;
                 if (key !== "select" && key !== "actions") {
                   applyCellUpdate(row, key, currentRow[c] || "");
                   rowChanged = true;
                 }
               }
             }
             if (rowChanged) newData[origIndex] = row;
           }
        }
        
        onDataChange?.(newData);
        return newData;
      });
    },
    [editingCell, selectionAnchor, selectionRange, columns, applyCellUpdate, onDataChange, table]
  );

  const handleCopyAction = React.useCallback((rIndex: number, cIndex: number) => {
    const colDef = columns[cIndex];
    const isSelectCol = colDef && colDef.id === "select";
    const key = colDef && "accessorKey" in colDef ? (colDef as any).accessorKey : "";

    if (selectionRange) {
      copySelectionToClipboard();
    } else if (!isSelectCol) {
      // No range selection — copy single focused cell
      const row = tableData[rIndex];
      if (row && key) {
        navigator.clipboard.writeText(getCellValue(row, key)).then(() => {
          setCopyFlash(true);
          setTimeout(() => setCopyFlash(false), 600);
        });
      }
    }
  }, [selectionRange, columns, tableData, copySelectionToClipboard]);

  const handlePasteAction = React.useCallback(() => {
    if (!navigator.clipboard) {
      Swal.fire("Error", "Browser Anda tidak mendukung akses Clipboard otomatis. Silakan gunakan browser terbaru.", "error");
      return;
    }
    navigator.clipboard.readText().then(text => {
      if (text) {
        try {
          processPasteData(text);
        } catch (err: any) {
          Swal.fire("Paste Error", err.message, "error");
        }
      }
    }).catch(err => {
      console.error("Failed to read clipboard:", err);
      Swal.fire("Akses Ditolak", "Gagal membaca clipboard. Pastikan Anda mengizinkan akses clipboard saat muncul popup di browser.", "warning");
    });
  }, [processPasteData]);

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
        setSelectionAnchor({ rowIndex: nextRow, colIndex });
        setSelectionFocus({ rowIndex: nextRow, colIndex });
        focusCell(nextRow, colIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditingCell(null);
        focusCell(rowIndex, colIndex);
      } else if (e.key === "Tab") {
        e.preventDefault();
        saveEdit(rowIndex, colIndex);
        const nextCol = Math.min(columns.length - 1, colIndex + 1);
        setSelectionAnchor({ rowIndex, colIndex: nextCol });
        setSelectionFocus({ rowIndex, colIndex: nextCol });
        focusCell(rowIndex, nextCol);
      }
      return;
    }

    // Ctrl+C: copy selection range (or single cell if no range)
    if (e.key.toLowerCase() === "c" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCopyAction(rowIndex, colIndex);
      return;
    }

    let nextRow = rowIndex;
    let nextCol = colIndex;

    const isShift = e.shiftKey;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      setTableData(prev => {
        const newData = [...prev];
        let changed = false;

        if (selectionRange && (selectionRange.minRow !== selectionRange.maxRow || selectionRange.minCol !== selectionRange.maxCol)) {
          for (let r = selectionRange.minRow; r <= selectionRange.maxRow; r++) {
            const rowData = table.getRowModel().rows[r];
            const origIndex = rowData ? rowData.index : r;
            const row = { ...newData[origIndex] } as TransactionRow;
            let rowChanged = false;
            for (let c = selectionRange.minCol; c <= selectionRange.maxCol; c++) {
              const colDef = columns[c];
              if (colDef && "accessorKey" in colDef) {
                const k = (colDef as any).accessorKey;
                if (k !== "select" && k !== "actions") {
                  applyCellUpdate(row, k, "");
                  rowChanged = true;
                }
              }
            }
            if (rowChanged) newData[origIndex] = row;
            changed = changed || rowChanged;
          }
        } else if (!isSelectCol) {
          if (key && key !== "select" && key !== "actions") {
            const rowData = table.getRowModel().rows[rowIndex];
            const origIndex = rowData ? rowData.index : rowIndex;
            const row = { ...newData[origIndex] } as TransactionRow;
            applyCellUpdate(row, key, "");
            newData[origIndex] = row;
            changed = true;
          }
        }

        if (changed) {
          onDataChange?.(newData);
        }
        return newData;
      });
      return;
    }

    if (e.key === "ArrowUp") { e.preventDefault(); nextRow = Math.max(0, rowIndex - 1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); nextRow = Math.min(tableData.length - 1, rowIndex + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); nextCol = Math.max(0, colIndex - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); nextCol = Math.min(columns.length - 1, colIndex + 1); }
    else if (e.key === "Enter" && !isSelectCol) { e.preventDefault(); startEditing(rowIndex, colIndex); return; }
    else if (e.key === " " && isSelectCol) { return; }
    else if (e.key.toLowerCase() === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePasteAction();
      return;
    }
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
                        onContextMenu={(e) => {
                          e.preventDefault();
                          const inSelectionRange = selectionRange && 
                            rowIndex >= selectionRange.minRow && rowIndex <= selectionRange.maxRow &&
                            colIndex >= selectionRange.minCol && colIndex <= selectionRange.maxCol;

                          if (!inSelectionRange) {
                            setSelectionAnchor({ rowIndex, colIndex });
                            setSelectionFocus({ rowIndex, colIndex });
                            focusCell(rowIndex, colIndex);
                          }

                          setContextMenu({ x: e.clientX, y: e.clientY, rowIndex, colIndex });
                        }}
                        onFocus={() => {
                          if (!isDragging.current && !editingCell && !isKeyboardNavigating.current) {
                            const inSelectionRange = selectionRange && 
                              rowIndex >= selectionRange.minRow && rowIndex <= selectionRange.maxRow &&
                              colIndex >= selectionRange.minCol && colIndex <= selectionRange.maxCol;

                            if (!inSelectionRange) {
                              setSelectionAnchor({ rowIndex, colIndex });
                              setSelectionFocus({ rowIndex, colIndex });
                            }
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
      {contextMenu && (
        <div 
          className="fixed z-50 min-w-40 bg-white dark:bg-zinc-800 border dark:border-zinc-700 shadow-md rounded-md py-1 text-sm text-zinc-800 dark:text-zinc-200"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 100), left: Math.min(contextMenu.x, window.innerWidth - 160) }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
             const colDef = columns[contextMenu.colIndex];
             const key = colDef && "accessorKey" in colDef ? (colDef as any).accessorKey : null;
             const row = tableData[contextMenu.rowIndex];
             const isDateColumn = key === "date";
             const isDateWarning = isDateColumn && row?.isDateAmbiguous;
             return (
               <>
                 {isDateWarning && (
                   <button 
                     className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 text-green-600"
                     onClick={() => {
                       setTableData(prev => {
                         const rMin = selectionRange ? selectionRange.minRow : contextMenu.rowIndex;
                         const rMax = selectionRange ? selectionRange.maxRow : contextMenu.rowIndex;
                         const newData = [...prev];
                         for (let r = rMin; r <= rMax; r++) {
                           const rowData = table.getRowModel().rows[r];
                           const origIndex = rowData ? rowData.index : r;
                           newData[origIndex] = { ...newData[origIndex]!, isDateAmbiguous: false };
                         }
                         onDataChange?.(newData);
                         return newData;
                       });
                       setContextMenu(null);
                     }}
                   >
                     <CalendarCheck className="w-4 h-4" /> Confirm Date
                   </button>
                 )}
                 {isDateColumn && (
                   <button 
                     className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 text-blue-600 dark:text-blue-400"
                     onClick={() => {
                       setTableData(prev => {
                         const rMin = selectionRange ? selectionRange.minRow : contextMenu.rowIndex;
                         const rMax = selectionRange ? selectionRange.maxRow : contextMenu.rowIndex;
                         const newData = [...prev];
                         for (let r = rMin; r <= rMax; r++) {
                           const rowData = table.getRowModel().rows[r];
                           const origIndex = rowData ? rowData.index : r;
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
                                 isDateAmbiguous: false 
                               };
                             }
                           }
                         }
                         onDataChange?.(newData);
                         return newData;
                       });
                       setContextMenu(null);
                     }}
                   >
                     <ArrowRightLeft className="w-4 h-4" /> Swap Day & Month
                   </button>
                 )}
                 {isDateColumn && <div className="h-px bg-border my-1 mx-2" />}
                 <button 
                   className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
                   onClick={() => {
                     handleCopyAction(contextMenu.rowIndex, contextMenu.colIndex);
                     setContextMenu(null);
                   }}
                 >
                   <Copy className="w-4 h-4" /> Copy
                 </button>
                 <button 
                   className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
                   onClick={() => {
                     handlePasteAction();
                     setContextMenu(null);
                   }}
                 >
                   <ClipboardPaste className="w-4 h-4" /> Paste
                 </button>
               </>
             );
          })()}
        </div>
      )}
    </div>
  );
}
