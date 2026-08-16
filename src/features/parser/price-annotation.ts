import { parseAmount } from "./amount-parser";

/** Matches the trailing "=> <amount>" annotation of an item name. */
const ANNOTATION_REGEX = /=>([^=>]*)$/;

/** Accepts "226.44k", "Rp 1.032", "25rb", "1,5jt" — nothing else. */
const AMOUNT_ONLY_REGEX =
  /^[+-]?\s*(?:rp\.?\s*)?\d+(?:[.,]\d+)*\s*(?:k|rb|ribu|m|jt|juta)?$/i;

/**
 * Formats an amount as the k-shorthand used in item annotations.
 * Keeps every significant digit so the value round-trips exactly:
 * 226440 => "226.44k" (not "226.4k"), 1032 => "1.032k", 25000 => "25k".
 */
export function formatPriceAnnotation(amount: number): string {
  // Round away binary noise (max 2 decimals = cents) before scaling down.
  const cents = Math.round(Math.abs(amount) * 100) / 100;
  return `${cents / 1000}k`;
}

/**
 * Reads back the amount from an annotated item line (e.g. "Boba => 25.5k").
 * Returns the absolute value, or null when the line carries no annotation.
 * Sign handling (expense/contra) is the caller's responsibility.
 */
export function extractAnnotatedAmount(line: string): number | null {
  const match = line.match(ANNOTATION_REGEX);
  const raw = match?.[1]?.trim();
  if (!raw || !AMOUNT_ONLY_REGEX.test(raw)) return null;
  return parseAmount(raw, true);
}
