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

  // Handle keyboard navigation (Arrow keys)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableCellElement>, rowIndex: number, colIndex: number) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;

    if (e.key === "ArrowUp") nextRow = Math.max(0, rowIndex - 1);
    else if (e.key === "ArrowDown") nextRow = Math.min(tableData.length - 1, rowIndex + 1);
    else if (e.key === "ArrowLeft") nextCol = Math.max(0, colIndex - 1);
    else if (e.key === "ArrowRight") nextCol = Math.min(columns.length - 1, colIndex + 1);
    else return;

    e.preventDefault();
    const targetCell = document.querySelector(`[data-row-index="${nextRow}"][data-col-index="${nextCol}"]`) as HTMLElement;
    if (targetCell) {
      targetCell.focus();
    }
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
                  {row.getVisibleCells().map((cell, colIndex) => (
                    <TableCell
                      key={cell.id}
                      className="border-r border-border p-2 focus:bg-primary/10 focus:outline-none focus:ring-1 focus:ring-primary focus:ring-inset"
                      tabIndex={0}
                      data-row-index={rowIndex}
                      data-col-index={colIndex}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                    >
                      <div className="min-h-[24px] cursor-text">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </TableCell>
                  ))}
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
