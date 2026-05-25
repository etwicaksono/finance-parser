/**
 * Parses amount from text.
 * e.g., "2k" => -2000, "2rb" => -2000, "Rp5.000" => -5000
 * 
 * @param text The string to parse.
 * @param isIncome If true, returns positive amount. Default is false (expense = negative).
 */
export function parseAmount(text: string, isIncome: boolean = false): number | null {
  if (!text) return null;

  // 1. Clean the string
  let cleaned = text.toLowerCase().replace(/\s+/g, "");
  
  // Remove currency symbols or prefixes
  cleaned = cleaned.replace(/^(rp\.|idr\.|rp|idr)/, "");

  // 2. Detect multipliers
  let multiplier = 1;
  if (cleaned.endsWith("k") || cleaned.endsWith("rb") || cleaned.endsWith("ribu")) {
    multiplier = 1000;
    cleaned = cleaned.replace(/(k|rb|ribu)$/, "");
  } else if (cleaned.endsWith("m") || cleaned.endsWith("jt") || cleaned.endsWith("juta")) {
    multiplier = 1000000;
    cleaned = cleaned.replace(/(m|jt|juta)$/, "");
  }

  // 3. Handle number formatting
  let numericValue: number;

  if (multiplier > 1) {
    // Has multiplier (e.g., "2.5k", "2,5rb"). Assume dot and comma are decimal points.
    cleaned = cleaned.replace(",", ".");
    numericValue = parseFloat(cleaned);
  } else {
    // No multiplier (e.g., "2.000", "5.000.000", "150,50")
    // Assume dot is thousand separator and comma is decimal.
    cleaned = cleaned.replace(/\./g, ""); // remove thousand separators
    cleaned = cleaned.replace(",", ".");  // comma to decimal dot
    numericValue = parseFloat(cleaned);
  }

  if (isNaN(numericValue)) return null;

  // 4. Calculate final amount and apply sign
  let finalAmount = numericValue * multiplier;
  
  if (!isIncome) {
    finalAmount = -Math.abs(finalAmount); // Expense defaults to negative
  } else {
    finalAmount = Math.abs(finalAmount);  // Income is positive
  }

  return finalAmount;
}
