"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import { Copy, Loader2, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

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
import { KeywordMapping } from "@/features/suggestions/types";

import { CategoryDropdown } from "../category-dropdown";
import { AccountDropdown } from "../account-dropdown";
import { FloatingEditor } from "../floating-editor";

import { getColumns } from "./columns";
import { SpreadsheetContextMenu } from "./context-menu";
import { useSpreadsheetSelection } from "./hooks/use-spreadsheet-selection";
import { CellPos } from "./types";
import {
  applyColumnUpdate,
  getColumnCellValue,
  isColumnDropdown,
  isColumnEditable,
  type ColumnHandlerContext,
} from "./column-handlers";

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
  onAutoMapRows?: (rowIndices: number[], useAI: boolean) => void;
  keywordMappings?: KeywordMapping[];
  emptyMessage?: string;
  loading?: boolean;
  loadingText?: string;
}

const RECENT_ACCOUNTS: string[] = [];

export function SpreadsheetTable({
  data,
  categories,
  accounts,
  contraKeywords = [],
  viewMode = "raw",
  onDataChange,
  onEditGroupedItems,
  onCategoryChange,
  onCopyRows,
  onResolveDuplicate,
  onAutoMapRows,
  keywordMappings = [],
  emptyMessage = "No data available.",
  loading = false,
  loadingText = "Loading...",
}: SpreadsheetTableProps) {
  const tableId = React.useId().replace(/:/g, "");
  const [tableData, setTableData] = React.useState<TransactionRow[]>(data);
  const [editingCell, setEditingCell] = React.useState<CellPos | null>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [includeHeader, setIncludeHeader] = React.useState(true);
  const [copyFlash, setCopyFlash] = React.useState(false);

  // Ref to skip ghost row effect when data was just synced from props
  const skipGhostRowRef = React.useRef(false);

  // Sync external data prop to internal state (must run before ghost row effect)
  React.useEffect(() => {
    skipGhostRowRef.current = true;
    setTableData(data);
  }, [data]);

  // Ghost Row logic
  React.useEffect(() => {
    if (skipGhostRowRef.current) {
      skipGhostRowRef.current = false;
      return;
    }
    if (viewMode === "grouped") return;

    const isRowEmpty = (row: TransactionRow) => {
      return !row.item && !row.amount && !row.categoryId;
    };

    const lastRow = tableData[tableData.length - 1];

    if (!lastRow || !isRowEmpty(lastRow)) {
      const newRow: TransactionRow = {
        id: crypto.randomUUID(),
        date: lastRow?.date || (new Date().toISOString().split("T")[0] as string),
        item: "",
        amount: null,
        categoryId: null,
        accountId: lastRow ? lastRow.accountId : null,
        notes: "",
        isDuplicate: false,
        source: "manual-input",
      };

      const newData = [...tableData, newRow];
      setTableData(newData);

      // Delaying onDataChange to prevent infinite loops if HomeClient overwrites
      setTimeout(() => {
        onDataChange?.(newData);
      }, 0);
    }
  }, [tableData, viewMode, onDataChange]);

  const insertRowBelow = React.useCallback((index: number) => {
    setTableData((prev) => {
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
    setTableData((prev) => {
      const newData = [...prev];
      newData.splice(index, 1);
      onDataChange?.(newData);
      return newData;
    });
  }, [onDataChange]);

  const columns = React.useMemo(
    () =>
      getColumns({
        categories,
        accounts,
        viewMode,
        insertRowBelow,
        deleteRow,
        onEditGroupedItems,
        onResolveDuplicate,
      }),
    [categories, accounts, viewMode, insertRowBelow, deleteRow, onEditGroupedItems, onResolveDuplicate]
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

  const {
    selectionAnchor,
    setSelectionAnchor,
    setSelectionFocus,
    multiSelections,
    setMultiSelections,
    selectionRange,
    isCellSelected,
    selectionStats,
    isAnySingleCellSelected,
    selectionLabel,
  } = useSpreadsheetSelection(tableData, columns);

  const isDragging = React.useRef(false);
  const isKeyboardNavigating = React.useRef(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const autoScrollInterval = React.useRef<NodeJS.Timeout | null>(null);
  const checkboxShiftRef = React.useRef(false);
  const lastCheckedRowIndex = React.useRef<number | null>(null);
  const lastCheckedValue = React.useRef<boolean>(true);
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; rowIndex: number; colIndex: number } | null>(null);

  // Column handler context — shared across all cell update operations
  const columnHandlerContext = React.useMemo<ColumnHandlerContext>(() => {
    const ctx: ColumnHandlerContext = {
      categories,
      accounts,
      contraKeywords,
      keywordMappings,
    };
    if (onCategoryChange) {
      ctx.onCategoryChange = onCategoryChange;
    }
    return ctx;
  }, [categories, accounts, contraKeywords, keywordMappings, onCategoryChange]);

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
  }, [setSelectionFocus]);

  const getCellValue = React.useCallback(
    (row: TransactionRow, colKey: string): string => getColumnCellValue(row, colKey, columnHandlerContext),
    [columnHandlerContext]
  );

  // Copy selection range as TSV
  const copySelectionToClipboard = React.useCallback(() => {
    if (!selectionRange && multiSelections.length === 0) return;

    const ranges = [...multiSelections];
    if (selectionRange) ranges.push(selectionRange);

    let minR = Infinity;
    let maxR = -Infinity;
    let minC = Infinity;
    let maxC = -Infinity;
    
    for (const r of ranges) {
      minR = Math.min(minR, r.minRow);
      maxR = Math.max(maxR, r.maxRow);
      minC = Math.min(minC, r.minCol);
      maxC = Math.max(maxC, r.maxCol);
    }

    const rows = table.getRowModel().rows;
    const sanitize = (s: string) => {
      if (s.includes("\n") || s.includes("\r") || s.includes("\t") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const tsv: string[] = [];
    const copiedOriginals: TransactionRow[] = [];
    
    const checkIsCellSelected = (rowIndex: number, colIndex: number) => {
      return ranges.some(range => 
        rowIndex >= range.minRow &&
        rowIndex <= range.maxRow &&
        colIndex >= range.minCol &&
        colIndex <= range.maxCol
      );
    };

    for (let r = minR; r <= maxR; r++) {
      const row = rows[r];
      if (!row) continue;
      
      let hasSelectedCellInRow = false;
      const rowValues: string[] = [];
      
      for (let c = minC; c <= maxC; c++) {
        if (!checkIsCellSelected(r, c)) {
           rowValues.push("");
           continue;
        }
        hasSelectedCellInRow = true;

        const colDef = columns[c];
        const key = colDef && "accessorKey" in colDef ? (colDef as { accessorKey: string }).accessorKey : null;
        if (key === "notes") continue;
        if (!key) {
          rowValues.push("");
          continue;
        }
        rowValues.push(sanitize(getCellValue(row.original, key)));
      }
      if (hasSelectedCellInRow) {
        copiedOriginals.push(row.original);
        tsv.push(rowValues.join("\t"));
      }
    }

    navigator.clipboard.writeText(tsv.join("\n")).then(() => {
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 600);
      
      if (onCopyRows) {
        onCopyRows(copiedOriginals);
      }
    });
  }, [selectionRange, multiSelections, table, columns, getCellValue, onCopyRows]);

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

  const handleDeleteSelectedRows = React.useCallback(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    const selectedIds = new Set(selectedRows.map((r) => r.original.id));
    const newData = tableData.filter((row) => !selectedIds.has(row.id));

    setTableData(newData);
    setRowSelection({});
    onDataChange?.(newData);
  }, [table, tableData, onDataChange]);

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
      const key = (colDef as { accessorKey: string }).accessorKey;
      if (!isColumnEditable(key)) return;

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

  // Cell update is delegated to per-column handlers via the registry.
  // See column-handlers.ts for each column's specific update logic.

  const saveEdit = React.useCallback(
    (rowIndex: number, colIndex: number, explicitValue?: string) => {
      setEditingCell((prev) => {
        if (!prev) {
          return prev;
        }
        if (prev.rowIndex !== rowIndex || prev.colIndex !== colIndex) {
          return prev;
        }
        const colDef = columns[colIndex];
        if (!colDef || !("accessorKey" in colDef)) {
          return null;
        }
        const key = (colDef as { accessorKey: string }).accessorKey;
        const newData = [...tableData];
        const rowData = table.getRowModel().rows[rowIndex];
        const origIndex = rowData ? rowData.index : rowIndex;
        const row = { ...newData[origIndex] } as TransactionRow;
        const valToSave = explicitValue !== undefined ? explicitValue : editValue;

        applyColumnUpdate(row, key, valToSave, columnHandlerContext);

        newData[origIndex] = row as TransactionRow;
        setTableData(newData);
        onDataChange?.(newData);
        return null;
      });
    },
    [columns, editValue, tableData, columnHandlerContext, onDataChange, table]
  );

  // --- Navigation helpers (shared across all editor types) ---

  const saveAndMoveDown = React.useCallback(
    (rowIndex: number, colIndex: number, value?: string) => {
      saveEdit(rowIndex, colIndex, value);
      const nextRow = Math.min(tableData.length - 1, rowIndex + 1);
      setSelectionAnchor({ rowIndex: nextRow, colIndex });
      setSelectionFocus({ rowIndex: nextRow, colIndex });
      focusCell(nextRow, colIndex);
    },
    [saveEdit, tableData, focusCell, setSelectionAnchor, setSelectionFocus]
  );

  const saveAndMoveRight = React.useCallback(
    (rowIndex: number, colIndex: number, value?: string) => {
      saveEdit(rowIndex, colIndex, value);
      const nextCol = Math.min(columns.length - 1, colIndex + 1);
      setSelectionAnchor({ rowIndex, colIndex: nextCol });
      setSelectionFocus({ rowIndex, colIndex: nextCol });
      focusCell(rowIndex, nextCol);
    },
    [saveEdit, columns, focusCell, setSelectionAnchor, setSelectionFocus]
  );

  const cancelEdit = React.useCallback(
    (rowIndex: number, colIndex: number) => {
      setEditingCell(null);
      focusCell(rowIndex, colIndex);
    },
    [focusCell]
  );

  // --- Checkbox click handler (supports Shift+click range selection) ---

  const handleCheckboxClick = React.useCallback(
    (rowIndex: number, value: boolean) => {
      if (checkboxShiftRef.current && lastCheckedRowIndex.current !== null) {
        // Shift+click: select or deselect all rows from last checked to current
        const start = Math.min(lastCheckedRowIndex.current, rowIndex);
        const end = Math.max(lastCheckedRowIndex.current, rowIndex);
        const newSelection: RowSelectionState = { ...rowSelection };
        for (let i = start; i <= end; i++) {
          const r = table.getRowModel().rows[i];
          if (r) {
            if (lastCheckedValue.current) {
              newSelection[r.id] = true;
            } else {
              delete newSelection[r.id];
            }
          }
        }
        setRowSelection(newSelection);
      } else {
        // Normal click: toggle single row
        const r = table.getRowModel().rows[rowIndex];
        if (r) {
          const newSelection: RowSelectionState = { ...rowSelection };
          if (value) {
            newSelection[r.id] = true;
          } else {
            delete newSelection[r.id];
          }
          setRowSelection(newSelection);
        }
        lastCheckedValue.current = value;
      }
      lastCheckedRowIndex.current = rowIndex;
    },
    [rowSelection, table]
  );

  // --- Cell editor renderer (dispatches to the right editor per column) ---

  const renderCellEditor = React.useCallback(
    (colKey: string, rowIndex: number, colIndex: number): React.ReactNode => {
      switch (colKey) {
        case "accountId":
          return (
            <AccountDropdown
              options={accounts}
              recentIds={RECENT_ACCOUNTS}
              value={accounts.some((a) => a.id === editValue) ? editValue : null}
              initialSearch={accounts.some((a) => a.id === editValue) ? "" : editValue}
              onSelect={(newVal) => saveAndMoveDown(rowIndex, colIndex, newVal || "")}
              onClose={() => cancelEdit(rowIndex, colIndex)}
            />
          );
        case "categoryId":
          return (
            <CategoryDropdown
              options={categories}
              value={categories.some((c) => c.id === editValue) ? editValue : null}
              initialSearch={categories.some((c) => c.id === editValue) ? "" : editValue}
              onSelect={(newVal) => saveAndMoveDown(rowIndex, colIndex, newVal || "")}
              onClose={() => cancelEdit(rowIndex, colIndex)}
            />
          );
        case "date":
          return (
            <input
              type="date"
              ref={(el) => {
                if (el && !el.dataset.pickerOpened) {
                  el.dataset.pickerOpened = "true";
                  el.focus();
                  try {
                    el.showPicker();
                  } catch {
                    // showPicker() can throw if not supported
                  }
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
          );
        default:
          return null; // text columns use FloatingEditor, handled in JSX
      }
    },
    [accounts, categories, editValue, saveAndMoveDown, cancelEdit, saveEdit, tableData, focusCell]
  );

  // Mouse handlers for drag-selection
  const handleCellMouseDown = (e: React.MouseEvent, rowIndex: number, colIndex: number, isSelectCol: boolean) => {
    if (isSelectCol) return;
    if (editingCell) return;

    if (e.button === 2) return; // Let onContextMenu handle right clicks

    // Prevent text selection in the browser while dragging across cells
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      if (selectionRange) {
        setMultiSelections((prev) => [...prev, selectionRange]);
      }
      setSelectionAnchor({ rowIndex, colIndex });
      setSelectionFocus({ rowIndex, colIndex });
    } else if (e.shiftKey && selectionAnchor) {
      // Extend current selection
      setSelectionFocus({ rowIndex, colIndex });
    } else {
      // Start new selection
      setMultiSelections([]);
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

      const parsedRows = clipboardText.split(/\r?\n/).map((row) => row.split("\t"));
      const lastRow = parsedRows[parsedRows.length - 1];
      if (lastRow && lastRow.length === 1 && lastRow[0] === "") {
        parsedRows.pop();
      }
      if (parsedRows.length === 0) return;

      let startRow = selectionAnchor?.rowIndex ?? 0;
      let startCol = selectionAnchor?.colIndex ?? 0;

      const isSingleValuePaste = parsedRows.length === 1 && parsedRows[0]?.length === 1;

      setTableData((prev) => {
        const newData = [...prev];

        // Behavior 1: Pasting single value into a larger selected range (fill range)
        const ranges = [...multiSelections];
        if (selectionRange) ranges.push(selectionRange);
        const isMultiCellSelection = ranges.length > 1 || (selectionRange && (selectionRange.minRow !== selectionRange.maxRow || selectionRange.minCol !== selectionRange.maxCol));

        if (isSingleValuePaste && isMultiCellSelection) {
          const val = parsedRows[0]?.[0] || "";
          const processed = new Set<string>();
          for (const range of ranges) {
            for (let r = range.minRow; r <= range.maxRow; r++) {
              const rowData = table.getRowModel().rows[r];
              const origIndex = rowData ? rowData.index : r;
              const row = { ...newData[origIndex] } as TransactionRow;
              let rowChanged = false;
              for (let c = range.minCol; c <= range.maxCol; c++) {
                const keyStr = `${r},${c}`;
                if (processed.has(keyStr)) continue;
                processed.add(keyStr);

                const colDef = columns[c];
                if (colDef && "accessorKey" in colDef) {
                  const key = (colDef as { accessorKey: string }).accessorKey;
                  if (key !== "select" && key !== "actions") {
                    applyColumnUpdate(row, key, val, columnHandlerContext);
                    rowChanged = true;
                  }
                }
              }
              if (rowChanged) newData[origIndex] = row;
            }
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
                const key = (colDef as { accessorKey: string }).accessorKey;
                if (key !== "select" && key !== "actions") {
                  applyColumnUpdate(row, key, currentRow[c] || "", columnHandlerContext);
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
    [editingCell, selectionAnchor, selectionRange, multiSelections, columns, columnHandlerContext, onDataChange, table]
  );

  const handleCopyAction = React.useCallback(
    (rIndex: number, cIndex: number) => {
      const colDef = columns[cIndex];
      const isSelectCol = colDef && colDef.id === "select";
      const key = colDef && "accessorKey" in colDef ? (colDef as { accessorKey: string }).accessorKey : "";

      if (selectionRange || multiSelections.length > 0) {
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
    },
    [selectionRange, multiSelections, columns, tableData, copySelectionToClipboard, getCellValue]
  );

  const handlePasteAction = React.useCallback(() => {
    if (!navigator.clipboard) {
      Swal.fire("Error", "Browser Anda tidak mendukung akses Clipboard otomatis. Silakan gunakan browser terbaru.", "error");
      return;
    }
    navigator.clipboard
      .readText()
      .then((text) => {
        if (text) {
          try {
            processPasteData(text);
          } catch (err: unknown) {
            Swal.fire("Paste Error", err instanceof Error ? err.message : String(err), "error");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to read clipboard:", err);
        Swal.fire("Akses Ditolak", "Gagal membaca clipboard. Pastikan Anda mengizinkan akses clipboard saat muncul popup di browser.", "warning");
      });
  }, [processPasteData]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableCellElement>, rowIndex: number, colIndex: number) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex;
    const colDef = columns[colIndex];
    const isSelectCol = colDef && colDef.id === "select";
    const key = colDef && "accessorKey" in colDef ? (colDef as { accessorKey: string }).accessorKey : "";
    const isDropdown = isColumnDropdown(key);

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
      setTableData((prev) => {
        const newData = [...prev];
        let changed = false;

        const ranges = [...multiSelections];
        if (selectionRange) ranges.push(selectionRange);
        const isMultiCellSelection = ranges.length > 1 || (selectionRange && (selectionRange.minRow !== selectionRange.maxRow || selectionRange.minCol !== selectionRange.maxCol));

        if (isMultiCellSelection) {
          const processed = new Set<string>();
          for (const range of ranges) {
            for (let r = range.minRow; r <= range.maxRow; r++) {
              const rowData = table.getRowModel().rows[r];
              const origIndex = rowData ? rowData.index : r;
              const row = { ...newData[origIndex] } as TransactionRow;
              let rowChanged = false;
              for (let c = range.minCol; c <= range.maxCol; c++) {
                const keyStr = `${r},${c}`;
                if (processed.has(keyStr)) continue;
                processed.add(keyStr);

                const colDef = columns[c];
                if (colDef && "accessorKey" in colDef) {
                  const k = (colDef as { accessorKey: string }).accessorKey;
                  if (k !== "select" && k !== "actions") {
                    applyColumnUpdate(row, k, "", columnHandlerContext);
                    rowChanged = true;
                  }
                }
              }
              if (rowChanged) newData[origIndex] = row;
              changed = changed || rowChanged;
            }
          }
        } else if (!isSelectCol) {
          if (key && key !== "select" && key !== "actions") {
            const rowData = table.getRowModel().rows[rowIndex];
            const origIndex = rowData ? rowData.index : rowIndex;
            const row = { ...newData[origIndex] } as TransactionRow;
            applyColumnUpdate(row, key, "", columnHandlerContext);
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

    if (e.key === "ArrowUp") {
      e.preventDefault();
      nextRow = Math.max(0, rowIndex - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      nextRow = Math.min(tableData.length - 1, rowIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextCol = Math.max(0, colIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextCol = Math.min(columns.length - 1, colIndex + 1);
    } else if (e.key === "Enter" && !isSelectCol) {
      e.preventDefault();
      nextRow = Math.min(tableData.length - 1, rowIndex + 1);
    } else if (e.key === "F2" && !isSelectCol) {
      e.preventDefault();
      startEditing(rowIndex, colIndex);
      return;
    } else if (e.key === " " && isSelectCol) {
      return;
    } else if (e.key.toLowerCase() === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePasteAction();
      return;
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isSelectCol) {
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
        setMultiSelections([]);
        setSelectionAnchor({ rowIndex: nextRow, colIndex: nextCol });
        setSelectionFocus({ rowIndex: nextRow, colIndex: nextCol });
      }
      focusCell(nextRow, nextCol);
    }
  };

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
            <Button size="sm" variant="default" onClick={copySelectionToClipboard} className={copyFlash ? "bg-green-600" : ""}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Selection
            </Button>
          )}
          {Object.keys(rowSelection).length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                const count = Object.keys(rowSelection).length;
                Swal.fire({
                  title: "Hapus baris terpilih?",
                  text: `${count} baris akan dihapus.`,
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "Hapus",
                  cancelButtonText: "Batal",
                  confirmButtonColor: "#dc2626",
                }).then((result) => {
                  if (result.isConfirmed) {
                    handleDeleteSelectedRows();
                  }
                });
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({Object.keys(rowSelection).length})
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
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyRows}
            disabled={tableData.length === 0}
            className={copyFlash && (!selectionRange || isAnySingleCellSelected) ? "bg-green-600/10 border-green-600 text-green-600" : ""}
          >
            <Copy className="mr-2 h-4 w-4" />
            {Object.keys(rowSelection).length > 0 ? "Copy Selected Rows" : "Copy All Rows"}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative" ref={scrollContainerRef}>
        <Table
          className="border-collapse"
          containerClassName="absolute inset-0 overflow-auto pb-32 table-scroll-container"
          overlay={loading && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-background/90">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium">{loadingText}</p>
            </div>
          )}
        >
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
                      setMultiSelections([]);
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
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/30">
                  {row.getVisibleCells().map((cell, colIndex) => {
                    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex;
                    const isDropdown = isColumnDropdown(cell.column.id);
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
                          const inSelectionRange =
                            (selectionRange &&
                              rowIndex >= selectionRange.minRow &&
                              rowIndex <= selectionRange.maxRow &&
                              colIndex >= selectionRange.minCol &&
                              colIndex <= selectionRange.maxCol) ||
                            multiSelections.some(
                              (range) =>
                                rowIndex >= range.minRow && rowIndex <= range.maxRow && colIndex >= range.minCol && colIndex <= range.maxCol
                            );

                          if (!inSelectionRange) {
                            setMultiSelections([]);
                            setSelectionAnchor({ rowIndex, colIndex });
                            setSelectionFocus({ rowIndex, colIndex });
                            focusCell(rowIndex, colIndex);
                          }

                          setContextMenu({ x: e.clientX, y: e.clientY, rowIndex, colIndex });
                        }}
                        onFocus={() => {
                          if (!isDragging.current && !editingCell && !isKeyboardNavigating.current) {
                            const inSelectionRange =
                              (selectionRange &&
                                rowIndex >= selectionRange.minRow &&
                                rowIndex <= selectionRange.maxRow &&
                                colIndex >= selectionRange.minCol &&
                                colIndex <= selectionRange.maxCol) ||
                              multiSelections.some(
                                (range) =>
                                  rowIndex >= range.minRow && rowIndex <= range.maxRow && colIndex >= range.minCol && colIndex <= range.maxCol
                              );

                            if (!inSelectionRange) {
                              setMultiSelections([]);
                              setSelectionAnchor({ rowIndex, colIndex });
                              setSelectionFocus({ rowIndex, colIndex });
                            }
                          }
                        }}
                      >
                        {isEditing && (isDropdown || cell.column.id === "date") ? (
                          renderCellEditor(cell.column.id, rowIndex, colIndex)
                        ) : (
                          <>
                            <div
                              className={isSelectCol ? "absolute inset-0 flex items-center justify-center" : `min-h-[40px] whitespace-pre-wrap px-2 py-2 cursor-default select-none ${isEditing ? "opacity-0" : ""}`}
                              onDoubleClick={() => {
                                if (!isSelectCol) startEditing(rowIndex, colIndex);
                              }}
                              onPointerDown={isSelectCol ? (e) => {
                                checkboxShiftRef.current = e.shiftKey;
                              } : undefined}
                            >
                              {isSelectCol ? (
                                <Checkbox
                                  checked={row.getIsSelected()}
                                  onCheckedChange={(value) => handleCheckboxClick(rowIndex, !!value)}
                                  aria-label="Select row"
                                />
                              ) : (
                                flexRender(cell.column.columnDef.cell, cell.getContext())
                              )}
                            </div>
                            {isEditing && (
                              <FloatingEditor
                                initialValue={editValue}
                                targetCellId={`cell-${tableId}-${rowIndex}-${colIndex}`}
                                onSave={(val) => saveEdit(rowIndex, colIndex, val)}
                                onCancel={() => cancelEdit(rowIndex, colIndex)}
                                onNextRow={(val) => saveAndMoveDown(rowIndex, colIndex, val)}
                                onNextCol={(val) => saveAndMoveRight(rowIndex, colIndex, val)}
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
      <SpreadsheetContextMenu
        contextMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        columns={columns}
        tableData={tableData}
        setTableData={setTableData}
        table={table}
        selectionRange={selectionRange}
        multiSelections={multiSelections}
        onDataChange={onDataChange}
        handleCopyAction={handleCopyAction}
        handlePasteAction={handlePasteAction}
        onAutoMapRows={onAutoMapRows}
      />
    </div>
  );
}
