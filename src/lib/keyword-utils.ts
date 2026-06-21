export interface KeywordCleaningRules {
  quantityUnits: string[];
  discountPrefixes: string[];
}

export type KeywordCleaningRuleType = "quantity_unit" | "discount_prefix";

const DEFAULT_QUANTITY_UNITS = [
  "kg", "g", "gr", "gram", "ml", "liter", "l", "pcs", "buah", "biji",
  "slop", "pack", "ikat", "besek", "box", "porsi", "botol", "kaleng",
  "cup", "bungkus", "bks", "lembar", "lbr",
];

const DEFAULT_DISCOUNT_PREFIXES = ["Disc"];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildQuantityRegex(units: string[]): RegExp {
  const alternation = units.map(escapeRegex).join("|");
  return new RegExp(`^\\s*\\d+(?:[.,]\\d+)?\\s*(?:${alternation})?\\s+`, "i");
}

function buildDiscountRegex(prefixes: string[]): RegExp | null {
  if (prefixes.length === 0) return null;
  const alternation = prefixes.map(escapeRegex).join("|");
  return new RegExp(`\\s*\\((?:${alternation})[^)]*\\)\\s*$`, "i");
}

export const cleanKeyword = (item: string, rules?: KeywordCleaningRules) => {
  // 1. Split on price annotation delimiters (=> or =)
  let base = (item.split("=>")[0] || "").split("=")[0]?.trim() || "";

  // 2. Strip leading quantities like "2 ", "500gr ", "1.5 kg"
  const units = rules?.quantityUnits ?? DEFAULT_QUANTITY_UNITS;
  if (units.length > 0) {
    base = base.replace(buildQuantityRegex(units), "").trim();
  }

  // 3. Strip trailing discounts like "(Disc 6k)" or "(Disc. 1000)"
  const prefixes = rules?.discountPrefixes ?? DEFAULT_DISCOUNT_PREFIXES;
  const discRegex = buildDiscountRegex(prefixes);
  if (discRegex) {
    base = base.replace(discRegex, "").trim();
  }

  return base;
};
