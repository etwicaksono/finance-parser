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
  suggestion?: SuggestionResult;
}

export interface ParserResult {
  transactions: TransactionRow[];
  errors: string[];
}
