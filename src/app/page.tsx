"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MainWorkspace } from "@/components/layout/main-workspace";
import { WhatsAppInput } from "@/components/workspace/whatsapp-input";
import { SpreadsheetTable } from "@/components/workspace/spreadsheet-table";
import { TransactionRow } from "@/types";
import { parseChat } from "@/features/parser/chat-parser";
import { suggestCategory } from "@/features/suggestions/category-suggester";
import { format } from "date-fns";

export default function HomePage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const handleParse = (text: string) => {
    // 1. Parse raw text into structured but incomplete transactions
    const result = parseChat(text);
    
    // 2. We don't have real DB mappings here yet, so we pass empty arrays
    // Later we will fetch them from the database
    const mockMappings: any[] = [];
    const mockAliases: any[] = [];

    // 3. Map to TransactionRow and run suggestion engine
    const newRows: TransactionRow[] = result.transactions.map((t, index) => {
      // Use current date if no date was parsed
      const finalDate = t.date || format(new Date(), "yyyy-MM-dd");
      
      const suggestion = suggestCategory(t.item, mockMappings, mockAliases);

      return {
        id: crypto.randomUUID(),
        date: finalDate,
        item: t.item,
        amount: t.amount,
        categoryId: suggestion?.categoryId || null,
        accountId: null, // We could suggest account in the future based on hints
        notes: t.sender ? `Sender: ${t.sender}` : "",
      };
    });

    // Replace the entire table data or append? Usually we just append for a new paste session
    setTransactions((prev) => [...prev, ...newRows]);
  };

  return (
    <AppShell>
      <MainWorkspace
        inputPanel={<WhatsAppInput onParse={handleParse} />}
        spreadsheetPanel={
          <SpreadsheetTable data={transactions} onDataChange={setTransactions} />
        }
      />
    </AppShell>
  );
}
