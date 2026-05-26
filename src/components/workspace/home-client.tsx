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
import { format } from "date-fns";
import { KeywordMapping } from "@/features/suggestions/types";
import { batchClassifyTransactions } from "@/actions/classify";
import { addAiMapping } from "@/actions/mappings";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface HomeClientProps {
  initialCategories: CategoryOption[];
  initialAccounts: AccountOption[];
  initialMappings: KeywordMapping[];
}

export function HomeClient({ initialCategories, initialAccounts, initialMappings }: HomeClientProps) {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);

  const handleParse = async (text: string) => {
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
        if (suggestion.aiCategory) row.aiCategory = suggestion.aiCategory;
        if (suggestion.aiParentCategory) row.aiParentCategory = suggestion.aiParentCategory;
      }

      // If no valid category/AI category found locally, schedule for AI
      if (!row.categoryId && !row.aiCategory) {
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
    setIsClassifying(true);
    try {
      const aiResults = await batchClassifyTransactions(itemsToClassify);
      
      // Update rows with AI results and trigger learning loop
      for (const row of newRows) {
        if (!row.categoryId && !row.aiCategory) {
          const aiCat = aiResults.get(row.item.toLowerCase().trim());
          if (aiCat) {
            row.aiCategory = aiCat.category;
            row.aiParentCategory = aiCat.parent_category;
            row.aiType = aiCat.type;
            row.aiConfidence = aiCat.confidence;
            
            // Learning Loop: save back to DB in background
            addAiMapping(row.item, aiCat.category, aiCat.parent_category).catch(console.error);
          }
        }
      }
      
      finalizeAndGroup(newRows);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to classify transactions with AI");
      // Stop the process as requested by user
    } finally {
      setIsClassifying(false);
    }
  };

  const finalizeAndGroup = (newRows: TransactionRow[]) => {
    setTransactions((prev) => {
      const allRows = [...prev, ...newRows];
      const processed = detectDuplicates(allRows, prev);
      
      // Grouping Logic: Date × Category
      const map = new Map<string, TransactionRow>();
      for (const row of processed) {
        // Preference: aiCategory first, then DB categoryId, then Unknown
        let catForGrouping = "Unknown";
        if (row.aiCategory) {
          catForGrouping = row.aiCategory;
        } else if (row.categoryId) {
          catForGrouping = initialCategories.find(c => c.id === row.categoryId)?.name || row.categoryId;
        }

        const key = `${row.date}::${catForGrouping}`;
        const existing = map.get(key);

        if (existing) {
          // Combine
          existing.amount = (existing.amount ?? 0) + (row.amount ?? 0);
          
          // Only add item if it's not already in the string
          const itemParts = existing.item.split(", ").map(s => s.trim());
          if (row.item && !itemParts.includes(row.item.trim())) {
             existing.item = [existing.item, row.item].filter(Boolean).join(", ");
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

  return (
    <AppShell>
      <MainWorkspace
        inputPanel={<WhatsAppInput onParse={handleParse} />}
        spreadsheetPanel={
          <div className="relative h-full">
            {isClassifying && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium">Classifying with AI...</p>
              </div>
            )}
            <SpreadsheetTable 
              data={transactions} 
              onDataChange={setTransactions} 
              categories={initialCategories}
              accounts={initialAccounts}
            />
          </div>
        }
      />
    </AppShell>
  );
}
