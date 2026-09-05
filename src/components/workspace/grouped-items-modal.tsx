import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionRow, CategoryOption, AccountOption, LabelOption } from "@/types";
import { SpreadsheetTable } from "./spreadsheet";
import { Button } from "@/components/ui/button";

interface GroupedItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupRow: TransactionRow | null;
  rawTransactions: TransactionRow[];
  categories: CategoryOption[];
  accounts: AccountOption[];
  labels?: LabelOption[];
  onRawTransactionsChange: (newData: TransactionRow[]) => void;
  onCategoryChange: (rowId: string, itemString: string, newCategoryId: string) => void;
  onLabelsChange?: (rowId: string, itemString: string, labelIds: string[]) => void;
}

export function GroupedItemsModal({
  isOpen,
  onClose,
  groupRow,
  rawTransactions,
  categories,
  accounts,
  labels = [],
  onRawTransactionsChange,
  onCategoryChange,
  onLabelsChange
}: GroupedItemsModalProps) {
  if (!groupRow || !groupRow.rawItemIds) return null;

  // Filter the raw transactions that belong to this group
  const groupedRawItems = rawTransactions.filter(r => groupRow.rawItemIds?.includes(r.id));

  const handleDataChange = (updatedItems: TransactionRow[]) => {
    // We get a new array of items just for this group.
    // It could have additions, deletions, or edits.
    
    // First, find all IDs in the new array
    const newIds = new Set(updatedItems.map(r => r.id));
    
    // Create a new rawTransactions array
    let newRaw = [...rawTransactions];
    
    // Remove any items that were deleted from this group
    newRaw = newRaw.filter(r => {
      // If the item belonged to this group previously, but is no longer in the updated items, it was deleted
      if (groupRow.rawItemIds?.includes(r.id) && !newIds.has(r.id)) {
        return false;
      }
      return true;
    });

    // Update existing or add new
    updatedItems.forEach(updatedItem => {
      const idx = newRaw.findIndex(r => r.id === updatedItem.id);
      if (idx !== -1) {
        newRaw[idx] = updatedItem;
      } else {
        // Newly added item in the modal
        newRaw.push(updatedItem);
      }
    });

    onRawTransactionsChange(newRaw);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-7xl max-h-[90vh] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Grouped Items</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col border rounded-md min-h-[300px]">
          <SpreadsheetTable
            data={groupedRawItems}
            categories={categories}
            accounts={accounts}
            labels={labels}
            viewMode="raw"
            onDataChange={handleDataChange}
            onCategoryChange={onCategoryChange}
            {...(onLabelsChange ? { onLabelsChange } : {})}
          />
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
