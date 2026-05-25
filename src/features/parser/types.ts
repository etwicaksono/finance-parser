/**
 * Core types for the parser module.
 * Real types will be implemented in subsequent tasks.
 */

export interface ParsedTransaction {
  item: string;
  amount: number;
  date?: string;
  sender?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  errors: string[];
}
