import { ParsedTransaction } from "./types";
import { parseAmount } from "./amount-parser";

/**
 * Parses a single line of transaction.
 * Supports formats like:
 * - "Semangka => 2k"
 * - "Semangka = 2k"
 * - "Semangka 2k"
 * - "Makan 2 porsi 50.000"
 * 
 * Returns ParsedTransaction or null if invalid.
 */
export function parseLine(line: string): ParsedTransaction | null {
  if (!line || !line.trim()) return null;

  // Regex to split item name and amount string at the end of the line
  // It handles optional separators like =, =>, -, :
  // It matches amounts with optional Rp prefix, numbers with separators, and optional multipliers
  const regex = /^(.*?)\s*(?:=|=>|-|:)?\s*((?:rp\.?\s*)?\d+(?:[.,]\d+)*(?:\s*(?:k|rb|ribu|m|jt|juta))?)\s*$/i;
  
  const match = line.match(regex);
  if (!match) {
    return null;
  }

  const itemStr = match[1]?.trim();
  const amountStr = match[2]?.trim();

  if (!itemStr || !amountStr) {
    return null;
  }

  const amount = parseAmount(amountStr);
  if (amount === null) {
    return null;
  }

  return {
    item: itemStr,
    amount,
  };
}
