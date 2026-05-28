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
  // Regex to split item name and amount string at the end of the line
  // It matches optional separators and an optional + or - sign before the amount
  const regex = /^(.*?)\s*(?:=|=>|->|-|:)?\s*([+-]?\s*(?:rp\.?\s*)?\d+(?:[.,]\d+)*(?:\s*(?:k|rb|ribu|m|jt|juta))?)\s*$/i;
  
  const match = line.match(regex);
  if (!match) {
    return null;
  }

  const itemStr = match[1]?.trim();
  const amountStr = match[2]?.trim();

  if (!itemStr || !amountStr) {
    return null;
  }

  // Prevent parsing the year of a date (e.g. "15/05/2026") as an amount
  // If itemStr ends with a date separator without spaces, it's likely part of a date.
  if (itemStr.match(/[-/]$/) && !amountStr.toLowerCase().match(/[a-z]/)) {
    return null;
  }

  const isIncome = amountStr.includes("+");
  const amount = parseAmount(amountStr, isIncome);
  if (amount === null) {
    return null;
  }

  return {
    item: itemStr,
    amount,
  };
}
