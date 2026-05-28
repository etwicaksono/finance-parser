export interface KeywordMapping {
  keyword: string;
  categoryId: string | null;
  usageCount: number;
}

export interface AliasMapping {
  alias: string;
  canonicalText: string;
}

export interface SuggestionMatch {
  categoryId: string | null;
  confidence: number;
  source: "exact" | "alias" | "fuzzy";
}
