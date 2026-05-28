"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MainWorkspace } from "@/components/layout/main-workspace";
import { WhatsAppInput } from "@/components/workspace/whatsapp-input";
import { SpreadsheetTable } from "@/components/workspace/spreadsheet-table";
import { TransactionRow, CategoryOption, AccountOption } from "@/types";
import { parseChat } from "@/features/parser/chat-parser";
import { suggestCategory } from "@/features/suggestions/category-suggester";
import { detectDuplicates } from "@/features/validation/duplicate-detector";
import { getCategorySign } from "@/features/validation/category-sign";
import { format } from "date-fns";
import { KeywordMapping } from "@/features/suggestions/types";
import { batchClassifyTransactions } from "@/actions/classify";
import { addMapping, batchAddMappings } from "@/actions/mappings";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface HomeClientProps {
  initialCategories: CategoryOption[];
  initialAccounts: AccountOption[];
  initialMappings: KeywordMapping[];
}

export function HomeClient({ initialCategories, initialAccounts, initialMappings }: HomeClientProps) {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleParse = async (text: string) => {
    setIsProcessing(true);
    // Let React render the loading state
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      // 1. Initial Parse
      const result = parseChat(text);
      const mockAliases: any[] = [];
      const itemsToClassify: string[] = [];

      // 2. Local Tier (Exact & Fuzzy Mappings)
      const newRows: TransactionRow[] = result.transactions.map((t) => {
      const finalDate = t.date || format(new Date(), "yyyy-MM-dd");
      const suggestion = suggestCategory(t.item, initialMappings, mockAliases);

      const row: TransactionRow = {
        id: crypto.randomUUID(),
        date: finalDate,
        item: t.item,
        amount: t.amount,
        categoryId: suggestion?.categoryId || null,
        accountId: null,
        notes: t.sender ? `Sender: ${t.sender}` : "",
      };

      if (suggestion) {
        row.suggestion = suggestion;
      }

      // If categoryId was found locally, fix the sign immediately
      if (row.categoryId && row.amount) {
        const catName = initialCategories.find(c => c.id === row.categoryId)?.name;
        if (catName) {
          const sign = getCategorySign(catName);
          if (sign === "income") row.amount = Math.abs(row.amount);
          else if (sign === "expense") row.amount = -Math.abs(row.amount);
        }
      }

      // If no valid categoryId found locally, schedule for AI classification
      if (!row.categoryId) {
        itemsToClassify.push(row.item);
      }

      return row;
    });

      // If there's nothing to ask AI, we can just deduplicate and group immediately.
      if (itemsToClassify.length === 0) {
        finalizeAndGroup(newRows);
        return;
      }

      // 3. AI Tier (Gemini)
      const aiResults = await batchClassifyTransactions(itemsToClassify);
      
      // Update rows with AI results and trigger learning loop
      for (const row of newRows) {
        if (!row.categoryId) {
          const aiCat = aiResults.get(row.item.toLowerCase().trim());
          if (aiCat) {
            row.aiType = aiCat.type;
            row.aiConfidence = aiCat.confidence;
            
            // Resolve AI category name → categoryId via initialCategories
            const matchedCategory = initialCategories.find(
              (c) => c.name.toLowerCase() === aiCat.category.toLowerCase()
            );
            if (matchedCategory) {
              row.categoryId = matchedCategory.id;
              // Fix sign based on AI category
              const sign = getCategorySign(matchedCategory.name);
              if (row.amount) {
                if (sign === "income") row.amount = Math.abs(row.amount);
                else if (sign === "expense") row.amount = -Math.abs(row.amount);
              }
              // Learning Loop: save back to DB so future parses use local lookup
              addMapping(row.item, matchedCategory.id).catch(console.error);
            }
          }
        }
      }
      
      finalizeAndGroup(newRows);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to process transactions");
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeAndGroup = (newRows: TransactionRow[]) => {
    const formatItemWithPrice = (item: string, amount: number | null | undefined) => {
      if (!amount) return item;
      if (item.includes("=>")) return item;
      const kVal = Math.abs(amount) / 1000;
      const kStr = Number.isInteger(kVal) ? `${kVal}k` : `${parseFloat(kVal.toFixed(1))}k`;
      return `${item} => ${kStr}`;
    };

    newRows.forEach(row => {
      row.item = formatItemWithPrice(row.item, row.amount);
    });

    setTransactions(() => {
      const processedNewRows = detectDuplicates(newRows, []);
      const allRows = [...processedNewRows];
      
      // Grouping Logic: Date × Category
      const map = new Map<string, TransactionRow>();
      for (const row of allRows) {
        // Resolve categoryId → category name for grouping key
        let catForGrouping = "Unknown";
        if (row.categoryId) {
          catForGrouping = initialCategories.find(c => c.id === row.categoryId)?.name || row.categoryId;
        }

        const key = `${row.date}::${catForGrouping}`;
        const existing = map.get(key);

        if (existing) {
          // Combine
          existing.amount = (existing.amount ?? 0) + (row.amount ?? 0);
          
          // Only add item if it's not already in the string
          const itemParts = existing.item.split("\n").map(s => s.trim());
          if (row.item && !itemParts.includes(row.item.trim())) {
             existing.item = [existing.item, row.item].filter(Boolean).join("\n");
          }
          
          if (row.notes && !existing.notes.includes(row.notes)) {
             existing.notes = [existing.notes, row.notes].filter(Boolean).join(" | ");
          }
        } else {
          map.set(key, { ...row });
        }
      }
      return Array.from(map.values());
    });
  };

  const handleCategoryChange = (rowId: string, itemString: string, newCategoryId: string) => {
    const rawItems = itemString.split("\n").map(s => {
      const match = s.split("=>");
      return match[0]?.trim() || "";
    }).filter(Boolean);

    for (const rawItem of rawItems) {
      if (rawItem) {
        addMapping(rawItem, newCategoryId).then(() => {
          toast.success(`Mapped "${rawItem}" to new category`);
        }).catch(err => {
          console.error(err);
          toast.error(`Failed to map "${rawItem}"`);
        });
      }
    }
  };

  const handleCopyRows = async (copiedRows: TransactionRow[]) => {
    // Extract keyword & category pairs to bump their usage score
    const mappingsToBump = copiedRows
      .filter((r) => r.item && r.categoryId)
      .map((r) => ({ keyword: r.item, categoryId: r.categoryId! }));
      
    if (mappingsToBump.length > 0) {
      batchAddMappings(mappingsToBump).catch(console.error);
    }
  };

  return (
    <AppShell>
      <MainWorkspace
        inputPanel={<WhatsAppInput onParse={handleParse} onClear={() => setTransactions([])} />}
        spreadsheetPanel={
          <div className="relative flex-1 min-h-0 flex flex-col">
            {isProcessing && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium">Processing Data...</p>
              </div>
            )}
            <SpreadsheetTable 
              data={transactions} 
              onDataChange={setTransactions} 
              onCategoryChange={handleCategoryChange}
              onCopyRows={handleCopyRows}
              categories={initialCategories}
              accounts={initialAccounts}
            />
          </div>
        }
      />
    </AppShell>
  );
}
