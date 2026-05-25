"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MainWorkspace } from "@/components/layout/main-workspace";
import { WhatsAppInput } from "@/components/workspace/whatsapp-input";
import { SpreadsheetTable } from "@/components/workspace/spreadsheet-table";
import { TransactionRow } from "@/types";
import { parseChat } from "@/features/parser/chat-parser";
import { suggestCategory } from "@/features/suggestions/category-suggester";
import { detectDuplicates } from "@/features/validation/duplicate-detector";
import { format } from "date-fns";
import { CategoryOption, AccountOption } from "@/types";
import { KeywordMapping } from "@/features/suggestions/types";

interface HomeClientProps {
  initialCategories: CategoryOption[];
  initialAccounts: AccountOption[];
  initialMappings: KeywordMapping[];
}

export function HomeClient({ initialCategories, initialAccounts, initialMappings }: HomeClientProps) {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const handleParse = (text: string) => {
    const result = parseChat(text);
    
    const mockAliases: any[] = [];

    const newRows: TransactionRow[] = result.transactions.map((t, index) => {
      const finalDate = t.date || format(new Date(), "yyyy-MM-dd");
      const suggestion = suggestCategory(t.item, initialMappings, mockAliases);

      return {
        id: crypto.randomUUID(),
        date: finalDate,
        item: t.item,
        amount: t.amount,
        categoryId: suggestion?.categoryId || null,
        accountId: null,
        notes: t.sender ? `Sender: ${t.sender}` : "",
      };
    });

    setTransactions((prev) => {
      const processedNewRows = detectDuplicates(newRows, prev);
      return [...prev, ...processedNewRows];
    });
  };

  return (
    <AppShell>
      <MainWorkspace
        inputPanel={<WhatsAppInput onParse={handleParse} />}
        spreadsheetPanel={
          <SpreadsheetTable 
            data={transactions} 
            onDataChange={setTransactions} 
            categories={initialCategories}
            accounts={initialAccounts}
          />
        }
      />
    </AppShell>
  );
}
