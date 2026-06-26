import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown, AlertTriangle, Check, Trash, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CategoryOption, AccountOption, TransactionRow } from "@/types";

export interface GetColumnsProps {
  categories: CategoryOption[];
  accounts: AccountOption[];
  viewMode?: "raw" | "grouped";
  insertRowBelow: (index: number) => void;
  deleteRow: (index: number) => void;
  onEditGroupedItems?: ((row: TransactionRow) => void) | undefined;
  onResolveDuplicate?: ((rowIndex: number, action: "keep" | "remove") => void) | undefined;
}

export function getColumns({
  categories,
  accounts,
  viewMode,
  insertRowBelow,
  deleteRow,
  onEditGroupedItems,
  onResolveDuplicate,
}: GetColumnsProps): ColumnDef<TransactionRow>[] {
  return [
    {
      id: "select",
      size: 40,
      minSize: 40,
      maxSize: 40,
      header: ({ table }) => (
        <div className="flex w-full items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
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
      size: 120,
      minSize: 100,
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
      size: 150,
      minSize: 100,
      header: "Account",
      cell: (info) => {
        const val = info.getValue() as string;
        return accounts.find((a) => a.id === val)?.name || "-";
      },
    },
    {
      accessorKey: "categoryId",
      size: 150,
      minSize: 100,
      header: "Category",
      cell: (info) => {
        const val = info.getValue() as string;
        return categories.find((c) => c.id === val)?.name || "-";
      },
    },
    {
      accessorKey: "amount",
      size: 110,
      minSize: 80,
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
            {row.isUnmappedItem && !isDup && (
              <span title="Kategori kosong. Silakan isi manual." className="flex items-center justify-center p-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </span>
            )}
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
      size: 200,
      minSize: 100,
      header: "Notes",
      cell: (info) => info.getValue() || "",
    },
    {
      id: "actions",
      size: 80,
      minSize: 80,
      maxSize: 80,
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
  ];
}
