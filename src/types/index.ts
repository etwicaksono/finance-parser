import { SuggestionMatch } from "@/features/suggestions/types";

export interface CategoryOption {
  id: string;
  name: string;
}

export interface AccountOption {
  id: string;
  name: string;
}

export interface SuggestionResult {
  categoryId?: string;
  accountId?: string;
  confidence: number;
}

export interface SessionImage {
  id: string;
  url: string;
  name: string;
  isParsed: boolean;
}

export interface TransactionRow {
  id: string; // Unique identifier for the UI row
  date: string; // YYYY-MM-DD
  item: string;
  amount: number | null; // Use null to represent empty/invalid amount in UI
  categoryId: string | null;
  accountId: string | null;
  notes: string;
  // UI Specific State
  isDuplicate?: boolean;
  isValid?: boolean;
  isDateAmbiguous?: boolean;
  suggestion?: SuggestionMatch;
  // AI Categorization State (runtime only — not persisted to DB)
  aiType?: "income" | "expense";
  aiConfidence?: number;
  // Tracking original rows when grouped
  rawItemIds?: string[];
  // Data Source Tracking
  source?: "chat" | "scan" | "manual";
  receiptName?: string;
}

export interface SessionMetadata {
  whatsappText?: string;
  manualText?: string;
  translateNames?: boolean;
}

export interface ParserResult {
  transactions: TransactionRow[];
  errors: string[];
}
