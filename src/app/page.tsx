"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MainWorkspace } from "@/components/layout/main-workspace";
import { WhatsAppInput } from "@/components/workspace/whatsapp-input";
import { SpreadsheetTable } from "@/components/workspace/spreadsheet-table";
import { TransactionRow } from "@/types";

export default function HomePage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([
    {
      id: "1",
      date: "2026-05-16",
      item: "Semangka",
      amount: -20000,
      categoryId: null,
      accountId: null,
      notes: "",
    },
    {
      id: "2",
      date: "2026-05-16",
      item: "Gaji Bulanan",
      amount: 5000000,
      categoryId: null,
      accountId: null,
      notes: "Alhamdulillah",
    },
  ]);
  return (
    <AppShell>
      <MainWorkspace
        inputPanel={<WhatsAppInput />}
        spreadsheetPanel={
          <SpreadsheetTable data={transactions} onDataChange={setTransactions} />
        }
      />
    </AppShell>
  );
}
